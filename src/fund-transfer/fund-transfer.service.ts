import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { FundTransfer } from './fund-transfer.model';
import {
  TransferStatus,
  TransactionStatusResponse,
  TransactionIdResponse,
} from './fund-transfer.http-response-models';
import { map } from 'rxjs/operators';

@Injectable()
export class FundTransferService {
  constructor(private httpService: HttpService) { }

  findAccount(accountNumber: string) {
    return this.httpService
      .get(`https://acessoaccount.herokuapp.com/api/Account/${accountNumber}`)
      .pipe(map((response) => response.data));
  }

  doFundTransfer(
    accountOrigin: string,
    accountDestination: string,
    value: number,
  ): TransactionIdResponse {
    const fundTransfer = new FundTransfer(
      accountOrigin,
      accountDestination,
      value,
    );

    // TODO save in db...

    return fundTransfer;
  }

  checkTransactionStatus(): TransactionStatusResponse {
    return new TransactionStatusResponse(
      TransferStatus.ERROR,
      'Invalid account number',
    );
  }
}
