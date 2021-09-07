import { Module } from '@nestjs/common';
import { FundTransferService } from './fund-transfer.service';
import { BackgroundTasksService } from './fund-transfer.background-task';
import { FundTransferController } from './fund-transfer.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FundTransferSchema } from './fund-transfer.model';
import { SendGridModule } from '@anchan828/nest-sendgrid';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'FundTransfer', schema: FundTransferSchema },
    ]),
    SendGridModule.forRoot({
      apikey: process.env.SENDGRID_ACCESS_KEY,
    })
  ],
  controllers: [FundTransferController],
  providers: [FundTransferService, BackgroundTasksService],
})
export class FundTransferModule { }
