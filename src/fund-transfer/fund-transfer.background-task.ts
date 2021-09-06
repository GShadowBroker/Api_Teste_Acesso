import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FundTransfer, IAccount } from './fund-transfer.model';
import { TransferStatus } from './fund-transfer.http-response-models';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';

@Injectable()
export class BackgroundTasksService {
  private readonly logger = new Logger(BackgroundTasksService.name);

  constructor(
    @InjectModel('FundTransfer')
    private readonly fundTransferModel: Model<FundTransfer>,
  ) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron(): Promise<void> {
    this.logger.log("Executing background task...");

    let transactions = null;
    try {
      transactions = await this.fundTransferModel.find().where({ status: TransferStatus.IN_QUEUE }).exec();
    } catch (error) {
      this.logger.error(`There was an error while querying the database. ${error.message}`);
      return;
    }

    if (!transactions) return;

    for (const transaction of transactions) {
      this.logger.log(`Processing transaction '${transaction.transactionId}'`);
      this.handleFundTransfer(transaction);
    }
  }

  /**
   * Method responsible for managing fund transfer.
   * @param transaction [FundTransfer] The transaction object being processed.
   */
  private async handleFundTransfer(transaction: FundTransfer): Promise<void> {

    let accountOrigin: IAccount | null = null;
    let accountDestination: IAccount | null = null;

    try {
      accountOrigin = await this.findAccount(transaction.accountOrigin);
      accountDestination = await this.findAccount(transaction.accountDestination);

    } catch (error) {

      if (!error.response) {
        this.logger.warn(`There was an error communicating with remote server. ${error.message}`);
        return;
      }

      switch (error.response.status) {
        case HttpStatus.INTERNAL_SERVER_ERROR:
          this.logger.warn(`There was an error communicating with the remote server. ${error.message}`);
          break;
        case HttpStatus.NOT_FOUND:
          this.logger.warn('Invalid account number');
          await this.updateStatus(transaction.transactionId, TransferStatus.ERROR, "Invalid account number.");
          break;
        default:
          this.logger.error(`There was an unexpected error. ${error.message}`);
          this.logger.error(error);
          break;
      }
      return;
    }

    if (!accountOrigin || !accountDestination) {
      await this.updateStatus(transaction.transactionId, TransferStatus.ERROR, "Invalid account number");
      return;
    }

    // validate transaction
    const [isValid, reason] = this.isTransactionValid(transaction.value, accountOrigin, accountDestination);

    if (!isValid) {
      await this.updateStatus(transaction.transactionId, TransferStatus.ERROR, reason);
      return;
    }

    // TODO make sure both operations are finished, not just one

    // add value to destination
    const isCreditOperationFinished = await this.executeTransfer(transaction.transactionId, transaction.accountDestination, transaction.value, "Credit");

    if (!isCreditOperationFinished) {
      this.logger.warn("Error finishing transaction on account destination.");
      return;
    }

    // subtract value from origin
    const isDebitOperationFinished = await this.executeTransfer(transaction.transactionId, transaction.accountOrigin, transaction.value, "Debit");

    if (!isDebitOperationFinished) {
      this.logger.warn("Error finishing transaction on account origin.");
      return;
    }

    // update transaction status to confirmed
    const success = await this.updateStatus(transaction.transactionId, TransferStatus.CONFIRMED);

    if (success) this.logger.log("Operation complete.");
  }

  private async findAccount(accountNumber: string): Promise<IAccount | null> {
    const response = await axios.get(`${process.env.SERVER_BASE_URL}/${accountNumber}`);
    return response.data;
  }

  /**
   * Updates transaction status to either In Queue, Processing, Confirmed or Error with optional error message.
   * @param transactionId [string] The transaction id.
   * @param newStatus [TransferStatus] The new status being saved. One of In Queue, Processing, Confirmed or Error.
   * @param errorMessage [string] Optional string message stating the reason why the operation failed.
   * @return [boolean] A promise that resolves into a boolean. True if update was successful. False otherwise.
   */
  private async updateStatus(transactionId: string, newStatus: TransferStatus, errorMessage?: string): Promise<boolean> {
    let response = null;
    try {
      response = await this.fundTransferModel.updateOne({ transactionId }, {
        status: newStatus,
        errorMessage
      });
    } catch (error) {
      this.logger.error(`There was an error while querying the database. ${error.message}`);
      return false;
    }

    return !!response;
  }

  /**
   * Validates the transaction value and balance on the origin account.
   * @param value [number] The value being transferred.
   * @param accountOrigin [IAccount] The origin account where the value is being transferred from.
   * @param accountDestination [IAccount] The destination account where the value is being transferred to.
   * @return [boolean, string | null] Returns a list where the first value is a boolean and the
   * second a string message stating the reason why the transaction is invalid.
   */
  private isTransactionValid(value: number, accountOrigin: IAccount, accountDestination: IAccount): [boolean, string | null] {
    if (accountOrigin.id === accountDestination.id) {
      return [false, "Cannot transfer value to the same account"];
    }

    if (isNaN(value) || isNaN(accountOrigin.balance)) {
      return [false, "Invalid value or balance"];
    }

    else if (+value <= 0) {
      return [false, "Cannot transfer negative value"];
    }

    else if (+accountOrigin.balance - (+value) < 0) {
      return [false, "Insufficient funds on account origin to achieve this transaction"];
    }

    return [true, null];
  }

  /**
   * Makes the transfer by running a http post request to the remote server.
   * @param transactionId [string]
   * @param accountNumber [string]
   * @param value [number] the value being transferred
   * @param type [Credit | Debit] string specifying whether operation is credit or debit.
   * @return [boolean] Returns a promise that resolves into a boolean. True if transfer was successful. False otherwise.
   */
  private async executeTransfer(transactionId: string, accountNumber: string, value: number, type: "Credit" | "Debit"): Promise<boolean> {
    let response = null;
    try {
      response = await axios.post(process.env.SERVER_BASE_URL, {
        accountNumber,
        value,
        type
      });

      if (response?.status && response.status == HttpStatus.OK) {
        this.logger.log(`Transfer complete: ${JSON.stringify(response.data, null, 2)}`);
        return true;
      }

    } catch (error) {
      if (!error.response) {
        return false;
      }

      switch (error.response.status) {
        case HttpStatus.INTERNAL_SERVER_ERROR:
          this.logger.warn(`There was an error communicating with the remote server. ${error.message}`);
          break;

        case HttpStatus.NOT_FOUND:
          this.logger.warn(`Invalid account number '${accountNumber}'.`);
          await this.updateStatus(transactionId, TransferStatus.ERROR, "Invalid account number.");
          break;

        default:
          this.logger.error(`There was an unexpected error. ${error.message}`);
          this.logger.error(error);
      }
    }

    return false;
  }
}
