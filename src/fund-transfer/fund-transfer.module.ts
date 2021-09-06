import { Module } from '@nestjs/common';
import { FundTransferService } from './fund-transfer.service';
import { BackgroundTasksService } from './fund-transfer.background-task';
import { FundTransferController } from './fund-transfer.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FundTransferSchema } from './fund-transfer.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'FundTransfer', schema: FundTransferSchema },
    ]),
  ],
  controllers: [FundTransferController],
  providers: [FundTransferService, BackgroundTasksService],
})
export class FundTransferModule { }
