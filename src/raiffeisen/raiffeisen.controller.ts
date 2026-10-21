import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RaiffeisenService } from './raiffeisen.service';

@ApiTags('raiffeisen')
@Controller('raiffeisen')
export class RaiffeisenController {
  constructor(private readonly raiffeisen: RaiffeisenService) {}

  @Get()
  buildForm(@Query('order_id') orderId: string) {
    return this.raiffeisen.buildPaymentForm(orderId);
  }

  @Post('callback')
  callback(@Body() body: Record<string, unknown>) {
    return this.raiffeisen.handleCallback(body || {});
  }
}
