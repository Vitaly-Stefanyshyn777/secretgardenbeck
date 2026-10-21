import { createHash, createHmac } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';

/**
 * Інтернет-еквайринг АТ «Райффайзен Банк».
 * Параметри форми/підпису залежать від договору з банком —
 * налаштовуються через env (див. buildPaymentForm).
 */
@Injectable()
export class RaiffeisenService {
  private readonly logger = new Logger(RaiffeisenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private merchantId() {
    return (
      this.config.get<string>('RAIFFEISEN_MERCHANT_ID') ||
      this.config.get<string>('LIQPAY_PUBLIC_KEY') ||
      ''
    );
  }

  private secretKey() {
    return (
      this.config.get<string>('RAIFFEISEN_SECRET_KEY') ||
      this.config.get<string>('LIQPAY_PRIVATE_KEY') ||
      ''
    );
  }

  private checkoutUrl() {
    return (
      this.config.get<string>('RAIFFEISEN_CHECKOUT_URL') ||
      'https://pay.raiffeisen.ua/api/payment/create'
    );
  }

  private resultUrl(orderId: string) {
    const base =
      this.config.get<string>('RAIFFEISEN_RESULT_URL') ||
      this.config.get<string>('LIQPAY_RESULT_URL') ||
      'http://localhost:3001/order-success';
    const url = new URL(base);
    url.searchParams.set('orderId', orderId);
    return url.toString();
  }

  private serverUrl() {
    return (
      this.config.get<string>('RAIFFEISEN_SERVER_URL') ||
      'http://localhost:3000/api/raiffeisen/callback'
    );
  }

  private signPayload(raw: string) {
    const secret = this.secretKey();
    const mode = (
      this.config.get<string>('RAIFFEISEN_SIGN_MODE') || 'sha1hmac'
    ).toLowerCase();
    if (mode === 'sha1concat') {
      return createHash('sha1')
        .update(secret + raw + secret)
        .digest('hex');
    }
    return createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
  }

  async buildPaymentForm(orderId: string) {
    if (!orderId?.trim()) {
      throw new BadRequestException('order_id required');
    }

    const merchantId = this.merchantId();
    const secret = this.secretKey();
    if (!merchantId || !secret) {
      throw new BadRequestException(
        'RAIFFEISEN_MERCHANT_ID / RAIFFEISEN_SECRET_KEY не налаштовано',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const amount = Math.round(Number(order.total) * 100) / 100;
    const description =
      order.items.length > 0
        ? order.items
            .map((i) => i.product?.name || `Товар ${i.productId}`)
            .slice(0, 3)
            .join(', ')
        : `Замовлення ${order.id}`;

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: 'raiffeisen',
        paymentStatus: order.paymentStatus || 'PENDING',
      },
    });

    const payload = {
      merchantId,
      orderId: order.id,
      amount: amount.toFixed(2),
      currency: 'UAH',
      description: description.slice(0, 250),
      resultUrl: this.resultUrl(order.id),
      serverUrl: this.serverUrl(),
      language: 'uk',
    };

    const signBase = [
      payload.merchantId,
      payload.orderId,
      payload.amount,
      payload.currency,
    ].join(';');
    const signature = this.signPayload(signBase);

    return {
      action: this.checkoutUrl(),
      fields: {
        ...payload,
        signature,
      },
    };
  }

  async handleCallback(body: Record<string, unknown>) {
    const orderId = String(
      body.orderId || body.order_id || body.orderReference || '',
    );
    const status = String(
      body.status || body.transactionStatus || body.paymentStatus || '',
    ).toLowerCase();
    const signature = String(body.signature || body.merchantSignature || '');

    if (!orderId) {
      throw new BadRequestException('orderId required');
    }

    if (signature) {
      const amount = String(body.amount ?? '');
      const currency = String(body.currency || 'UAH');
      const expected = this.signPayload(
        [this.merchantId(), orderId, amount, currency].join(';'),
      );
      if (expected.toLowerCase() !== signature.toLowerCase()) {
        this.logger.warn(`Invalid Raiffeisen signature for ${orderId}`);
        throw new BadRequestException('Invalid signature');
      }
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const approved = ['success', 'approved', 'paid', 'ok', '1'].includes(
      status,
    );
    const declined = [
      'failure',
      'failed',
      'declined',
      'error',
      'expired',
      'reversed',
    ].includes(status);

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: 'raiffeisen',
        paymentStatus: approved ? 'PAID' : declined ? 'FAILED' : 'PENDING',
        status: approved ? 'PAID' : order.status,
      },
    });

    this.logger.log(`Raiffeisen callback ${orderId}: ${status || 'received'}`);
    return { ok: true };
  }
}
