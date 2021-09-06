import { HttpException, HttpStatus, Inject, Injectable, Logger, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { FundTransfer } from './fund-transfer.model';
import {
  TransferStatus,
  TransactionStatusResponse,
  TransactionIdResponse,
} from './fund-transfer.http-response-models';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable({ scope: Scope.REQUEST })
export class FundTransferService {
  private readonly logger = new Logger(FundTransferService.name);

  constructor(
    @InjectModel('FundTransfer') private readonly fundTransferModel: Model<FundTransfer>,
    @Inject(REQUEST) private readonly request: Request
  ) { }

  // Standardized log for api consultations and fund transfer requests
  private log(): void {
    this.logger.log(`method: ${this.request.method} url: ${this.request.url} ip: ${this.request.ip} body: ${JSON.stringify(this.request.body)}`);
  }

  async doFundTransfer(
    accountOrigin: string,
    accountDestination: string,
    value: number,
  ): Promise<TransactionIdResponse | HttpException> {

    this.log();

    // do basic user input validation
    this.validateTransaction(accountOrigin, accountDestination, value);

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

    this.log();

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

  private validateTransaction(accountOrigin: string, accountDestination: string, value: number): void {
    if (!accountOrigin || typeof accountOrigin != 'string') {
      throw new HttpException("Invalid or missing accountOrigin", HttpStatus.BAD_REQUEST);
    }

    if (!accountDestination || typeof accountDestination != 'string') {
      throw new HttpException("Invalid or missing accountDestination", HttpStatus.BAD_REQUEST);
    }

    if (!value || isNaN(value)) {
      throw new HttpException("Invalid or missing value", HttpStatus.BAD_REQUEST);
    }

    if (accountOrigin.toLowerCase() === accountDestination.toLowerCase()) {
      throw new HttpException("Cannot transfer value to the same account", HttpStatus.BAD_REQUEST);
    }
  }
}
