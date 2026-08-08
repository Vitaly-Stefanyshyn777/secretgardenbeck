import { Module } from '@nestjs/common';
import { WayforpayController } from './wayforpay.controller';
import { WayforpayService } from './wayforpay.service';

@Module({
  controllers: [WayforpayController],
  providers: [WayforpayService],
  exports: [WayforpayService],
})
export class WayforpayModule {}
