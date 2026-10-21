import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LiqpayService } from './liqpay.service';

@ApiTags('liqpay')
@Controller('liqpay')
export class LiqpayController {
  constructor(private readonly liqpay: LiqpayService) {}

  @Get()
  buildForm(@Query('order_id') orderId: string) {
    return this.liqpay.buildPaymentForm(orderId);
  }

  @Post('callback')
  callback(@Body() body: Record<string, unknown>) {
    return this.liqpay.handleCallback(body || {});
  }
}
