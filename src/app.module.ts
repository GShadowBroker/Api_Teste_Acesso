import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FundTransferService } from './fund-transfer/fund-transfer.service';
import { FundTransferController } from './fund-transfer/fund-transfer.controller';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [ConfigModule.forRoot(), HttpModule, MongooseModule.forRoot(process.env.MONGODB_URI)],
  controllers: [AppController, FundTransferController],
  providers: [AppService, FundTransferService],
})
export class AppModule { }
