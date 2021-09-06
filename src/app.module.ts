import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { FundTransferModule } from './fund-transfer/fund-transfer.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    ScheduleModule.forRoot(),
    FundTransferModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
