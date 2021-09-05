import { Module } from '@nestjs/common';
import { FundTransferService } from './fund-transfer.service';
import { FundTransferController } from './fund-transfer.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FundTransferSchema } from './fund-transfer.model';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [MongooseModule.forFeature([{ name: 'FundTransfer', schema: FundTransferSchema }]), HttpModule,],
    controllers: [FundTransferController],
    providers: [FundTransferService],
})
export class FundTransferModule { }
