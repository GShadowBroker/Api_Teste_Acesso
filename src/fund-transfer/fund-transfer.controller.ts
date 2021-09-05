import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { FundTransferService } from './fund-transfer.service';

@Controller('api/fund-transfer')
export class FundTransferController {
  constructor(private readonly fundTransferService: FundTransferService) { }

  @Post()
  createTransfer(
    @Body('accountOrigin') accountOrigin: string,
    @Body('accountDestination') accountDestination: string,
    @Body('value') value: number,
  ) {
    // TODO validations
    return this.fundTransferService.doFundTransfer(
      accountOrigin,
      accountDestination,
      value,
    );
  }

  @Get(':transactionId')
  async requestTransferStatus(@Param('transactionId') transactionId: string) {
    if (!transactionId || transactionId.length < 4) throw new HttpException("Invalid or missing transactionId", HttpStatus.BAD_REQUEST);
    return `The transaction ID is ${transactionId}`;
  }
}
