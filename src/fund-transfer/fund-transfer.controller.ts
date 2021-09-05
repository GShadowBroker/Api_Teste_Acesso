import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { FundTransferService } from './fund-transfer.service';

@Controller('api/fund-transfer')
export class FundTransferController {
  constructor(private readonly fundTransferService: FundTransferService) { }

  @Post()
  async createTransfer(
    @Body('accountOrigin') accountOrigin: string,
    @Body('accountDestination') accountDestination: string,
    @Body('value') value: number,
  ) {
    return await this.fundTransferService.doFundTransfer(
      accountOrigin,
      accountDestination,
      value,
    );
  }

  @Get(':transactionId')
  async requestTransferStatus(@Param('transactionId') transactionId: string) {
    return await this.fundTransferService.checkTransactionStatus(transactionId);
  }
}
