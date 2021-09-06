import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FundTransfer } from './fund-transfer.model';
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

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron(): Promise<void> {
    this.logger.log("Executing background task");

    let transactions;
    try {
      transactions = await this.fundTransferModel.find().where({ status: TransferStatus.IN_QUEUE }).exec();
    } catch (error) {
      this.logger.error(`There was an error while querying the database. ${error.message}`);
      return;
    }

    for (const transaction of transactions) {
      this.handleFundTransfer(transaction);
    }
  }

  private async findAccount(accountNumber: string) {
    const response = await axios.get(`https://acessoaccount.herokuapp.com/api/Account/${accountNumber}`);
    return response.data;
  }

  private async updateStatus(transactionId: string, newStatus: TransferStatus, errorMessage?: string): Promise<void> {
    await this.fundTransferModel.updateOne({ transactionId }, {
      status: newStatus,
      errorMessage
    });
  }

  private async executeTransfer(transactionId: string, accountNumber: string, value: number, type: "Credit" | "Debit"): Promise<boolean> {
    let response;
    try {
      response = await axios.post("https://acessoaccount.herokuapp.com/api/Account", {
        accountNumber,
        value,
        type
      });

      // TODO REFACTOR!

      if (response?.status && response.status == HttpStatus.OK) {
        this.logger.log(`Transfer complete: ${JSON.stringify(response.data, null, 2)}`);
        return true;
      }

    } catch (error) {
      if (!response?.status) {
        return false;
      }

      switch (response.status) {
        case HttpStatus.INTERNAL_SERVER_ERROR:
          this.logger.error(`There was an error communicating with remote server. ${error.message}`);
          break;

        case HttpStatus.NOT_FOUND:
          this.logger.error(`Invalid account number '${accountNumber}'.`);

          // update status to error
          try {
            await this.updateStatus(transactionId, TransferStatus.ERROR, "Invalid account number.");
          } catch (error) {
            this.logger.error(`There was an error while querying the database. ${error.message}`);
          }

          break;

        default:
          this.logger.error(`There was an uncaught exception. ${error.message}`);
      }
    }

    return false;
  }

  private async handleFundTransfer(transaction: FundTransfer): Promise<void> {

    let accountOrigin, accountDestination;
    try {
      accountOrigin = await this.findAccount(transaction.accountOrigin);
      accountDestination = await this.findAccount(transaction.accountDestination);

    } catch (error) {
      if (error.message == "Request failed with status code 404") {
        this.logger.error('Invalid account number');
        // update status to error
        try {
          await this.updateStatus(transaction.transactionId, TransferStatus.ERROR, "Invalid account number.");
        } catch (error) {
          this.logger.error(`There was an error while querying the database. ${error.message}`);
        }
        return;
      } else {
        this.logger.error(`There was an error communicating with remote server. ${error.message}`);
        return;
      }
    }

    if (!accountOrigin || !accountDestination) {
      try {
        await this.fundTransferModel.updateOne({ transactionId: transaction.transactionId }, { status: TransferStatus.ERROR, errorMessage: "Invalid account number" });
      } catch (error) {
        this.logger.error(`There was an error while querying the database. ${error.message}`);
        return;
      }
    }

    console.log("accountOrigin", JSON.stringify(accountOrigin, null, 2));
    console.log("accountDestination", JSON.stringify(accountDestination, null, 2));


    // TODO check if the transaction is possible beforehand. Ex: if there's enough money for origin to pay!

    // add value to destination
    const isCreditOperationFinished = await this.executeTransfer(transaction.transactionId, transaction.accountDestination, transaction.value, "Credit");

    if (!isCreditOperationFinished) {
      this.logger.error("Couldn't finish transaction on account destination.");
      return;
    }

    // subtract value from origin
    const isDebitOperationFinished = await this.executeTransfer(transaction.transactionId, transaction.accountOrigin, transaction.value, "Debit");

    if (!isDebitOperationFinished) {
      this.logger.error("Couldn't finish transaction on account origin.");
      return;
    }

    // update transaction status to confirmed
    try {
      await this.fundTransferModel.updateOne({ transactionId: transaction.transactionId }, { status: TransferStatus.CONFIRMED });
    } catch (error) {
      this.logger.error(`There was an error while querying the database. ${error.message}`);
      return;
    }

    this.logger.debug("Operation complete.");
  }
}
