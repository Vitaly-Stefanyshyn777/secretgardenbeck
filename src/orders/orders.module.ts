import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { MailModule } from '../mail/mail.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';

@Module({
  imports: [MailModule, PromoCodesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
