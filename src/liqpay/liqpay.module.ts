import { Module } from '@nestjs/common';
import { LiqpayController } from './liqpay.controller';
import { LiqpayService } from './liqpay.service';

@Module({
  controllers: [LiqpayController],
  providers: [LiqpayService],
  exports: [LiqpayService],
})
export class LiqpayModule {}
