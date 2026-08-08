import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WayforpayService } from './wayforpay.service';

@ApiTags('wayforpay')
@Controller('wayforpay')
export class WayforpayController {
  constructor(private readonly wayforpay: WayforpayService) {}

  @Get()
  buildForm(@Query('order_id') orderId: string) {
    return this.wayforpay.buildPaymentForm(orderId);
  }

  @Post('callback')
  callback(@Body() body: Record<string, unknown>) {
    return this.wayforpay.handleCallback(body || {});
  }
}
