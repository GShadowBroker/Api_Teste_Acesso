import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SendGridService } from "@anchan828/nest-sendgrid";
import { FundTransfer, IAccount } from './fund-transfer.model';
import { TransferStatus } from './fund-transfer.http-response-models';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';

@Injectable()
export class BackgroundTasksService {
  private readonly logger = new Logger(BackgroundTasksService.name);
  private readonly pendingTransactions: string[] = [];
  private counter = 1;

  constructor(
    @InjectModel('FundTransfer')
    private readonly fundTransferModel: Model<FundTransfer>,
    private readonly sendGrid: SendGridService
  ) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron(): Promise<void> {

    this.logger.log(`Running background task nº ${this.counter}...`);
    this.counter++;

    // find all transactions whose status is 'In Queue'.
    let transactions: FundTransfer[] = [];
    try {
      transactions = await this.fundTransferModel.find().where({ status: TransferStatus.IN_QUEUE }).exec();
    } catch (error) {
      this.logger.error(`There was an error while querying the database. ${error.message}`);
      return;
    }

    // change status to 'Processing'.
    for (const transaction of transactions) {
      await this.updateStatus(transaction.transactionId, TransferStatus.PROCESSING);
    }

    // process transactions.
    for (const transaction of transactions) {
      this.logger.log(`Processing transaction '${transaction.transactionId}'`);
      await this.handleFundTransfer(transaction);
    }

    await this.ping();
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
        await this.updateStatus(transaction.transactionId, TransferStatus.IN_QUEUE);
        return;
      }

      switch (error.response.status) {
        case HttpStatus.INTERNAL_SERVER_ERROR:
          this.logger.warn(`There was an error communicating with the remote server. ${error.message}`);
          await this.updateStatus(transaction.transactionId, TransferStatus.IN_QUEUE);
          break;
        case HttpStatus.NOT_FOUND:
          const errorMessage = 'Invalid account number';
          this.logger.warn(errorMessage);
          await this.updateStatus(transaction.transactionId, TransferStatus.ERROR, errorMessage);
          if (transaction.email) await this.sendEmail(transaction, TransferStatus.ERROR, errorMessage);
          break;
        default:
          this.logger.error(`There was an unexpected error. ${error.message}`);
          this.logger.error(error);
          await this.updateStatus(transaction.transactionId, TransferStatus.IN_QUEUE);
          break;
      }
      return;
    }

    if (!accountOrigin || !accountDestination) {
      await this.updateStatus(transaction.transactionId, TransferStatus.ERROR, "Invalid account number");
      if (transaction.email) await this.sendEmail(transaction, TransferStatus.ERROR, "Invalid account number");
      return;
    }

    // validate transaction
    const [isValid, reason] = this.isTransactionValid(transaction.value, accountOrigin, accountDestination);

    if (!isValid) {
      await this.updateStatus(transaction.transactionId, TransferStatus.ERROR, reason);
      if (transaction.email) await this.sendEmail(transaction, TransferStatus.ERROR, reason);
      return;
    }

    // subtract value from origin
    const isOriginSubtracted = this.pendingTransactions.indexOf(transaction.transactionId) > -1;

    let isDebitComplete: boolean;
    if (!isOriginSubtracted) {
      isDebitComplete = await this.executeTransfer(transaction.transactionId, transaction.accountOrigin, transaction.value, "Debit", transaction);
    }
    if (!isDebitComplete) {
      this.logger.warn("Error finishing transaction on account origin.");
      await this.updateStatus(transaction.transactionId, TransferStatus.IN_QUEUE);
      return;
    }

    // subtract value from origin
    const isCreditComplete = await this.executeTransfer(transaction.transactionId, transaction.accountDestination, transaction.value, "Credit", transaction);
    if (!isCreditComplete) {
      this.logger.warn("Error adding value to account destination. Retrying in the next cicle");
      this.pendingTransactions.push(transaction.transactionId);
      await this.updateStatus(transaction.transactionId, TransferStatus.IN_QUEUE);
      return;

    } else {
      // remove from pending array if complete
      const index = this.pendingTransactions.indexOf(transaction.transactionId);
      if (index > -1) {
        this.pendingTransactions.splice(index, 1);
      }
    }

    // update transaction status to confirmed
    const success = await this.updateStatus(transaction.transactionId, TransferStatus.CONFIRMED);

    if (success) {
      this.logger.log("Transfer fully completed.");
      if (transaction.email) await this.sendEmail(transaction, TransferStatus.CONFIRMED);
    }
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
  private async executeTransfer(transactionId: string, accountNumber: string, value: number, type: "Credit" | "Debit", transaction: FundTransfer): Promise<boolean> {
    let response = null;
    try {
      response = await axios.post(process.env.SERVER_BASE_URL, {
        accountNumber,
        value,
        type
      });

      if (response?.status && response.status == HttpStatus.OK) {
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
          if (transaction.email) this.sendEmail(transaction, TransferStatus.ERROR, "Invalid account number.");
          break;

        default:
          this.logger.error(`There was an unexpected error. ${error.message}`);
          this.logger.error(error);
      }
    }

    return false;
  }

  /**
   * Pings the server, keeping heroku's dynos awake. We don't want the app to sleep since that would mean
   * our cron jobs wouldn't be able to run. :) I'm not using Heroku Scheduler because I want to keep the app as agnostic as possible.
   */
  private async ping() {
    return axios.get(process.env.HOST_URL);
  }

  /**
   * Sends an email notification to the registered email about the status change of a transaction.
   * @param transaction [FundTransfer] The transaction object.
   * @param status [string] The new status of the transaction.
   * @param errorMessage [string] Optional error message when the transaction fails.
   * @return Returns true if email was sent with not errors. False otherwise.
   */
  private async sendEmail(transaction: FundTransfer, status: TransferStatus, errorMessage?: string): Promise<boolean> {
    let title: string;
    let text: string;

    let shouldSend = false;
    switch (status) {
      case (TransferStatus.CONFIRMED):
        title = "Your transaction has been completed successfully.";
        text = "Your transaction went through successfully and no further action on your part is necessary.";
        shouldSend = true;
        break;
      case (TransferStatus.ERROR):
        title = "Your transaction cannot be completed.";
        text = `Your transaction failed with the following error message: ${errorMessage}`;
        shouldSend = true;
        break;
      default:
        break;
    }

    if (!shouldSend) return false;

    try {
      await this.sendGrid.send({
        to: transaction.email,
        from: process.env.FROM_EMAIL,
        subject: title,
        text,
        html: `
            <h3><strong>${text}</strong></h3>
            <p>If you have not registered this e-mail for notification and you think this is a mistake,
            please ignore it.</p>
          `,
      });

    } catch (error) {
      this.logger.error(`Failed to send email notification to '${transaction.email}'`, error.message);
      return false;
    }

    return true;
  }
}
