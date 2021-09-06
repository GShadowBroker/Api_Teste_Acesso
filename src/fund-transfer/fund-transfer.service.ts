import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { FundTransfer } from './fund-transfer.model';
import {
  TransferStatus,
  TransactionStatusResponse,
  TransactionIdResponse,
} from './fund-transfer.http-response-models';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class FundTransferService {
  private readonly logger = new Logger(FundTransferService.name);

  constructor(@InjectModel('FundTransfer') private readonly fundTransferModel: Model<FundTransfer>) { }

  async doFundTransfer(
    accountOrigin: string,
    accountDestination: string,
    value: number,
  ): Promise<TransactionIdResponse | HttpException> {

    // validation

    const fundTransfer = new FundTransfer(
      accountOrigin,
      accountDestination,
      value,
    );

    // save in db
    let newFundTransfer;
    try {
      newFundTransfer = new this.fundTransferModel(fundTransfer);
      await newFundTransfer.save();
    } catch (error) {
      throw new HttpException(error.errors, HttpStatus.BAD_REQUEST);
    }

    return new TransactionIdResponse(newFundTransfer.transactionId);
  }

  async checkTransactionStatus(
    transactionId: string,
  ): Promise<TransactionStatusResponse | HttpException> {
    if (!transactionId)
      throw new HttpException(
        {
          status: 'Error',
          error: 'Invalid or missing transactionId',
        },
        HttpStatus.BAD_REQUEST,
      );

    let transaction;
    try {
      transaction = await this.findTransaction(transactionId);
    } catch (error) {
      throw new HttpException(
        `Transaction '${transactionId}' not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (transaction.status == TransferStatus.ERROR) {
      return new TransactionStatusResponse(transaction.status, transaction.errorMessage);
    }
    return new TransactionStatusResponse(transaction.status);
  }

  private async findTransaction(
    transactionId: string,
  ): Promise<FundTransfer | HttpException> {
    let transaction;
    try {
      transaction = await this.fundTransferModel
        .findOne()
        .where({ transactionId })
        .exec();
    } catch (error) {
      throw new HttpException(TransferStatus.ERROR, HttpStatus.NOT_FOUND);
    }
    if (!transaction) {
      throw new HttpException(TransferStatus.ERROR, HttpStatus.NOT_FOUND);
    }
    return transaction;
  }
}
