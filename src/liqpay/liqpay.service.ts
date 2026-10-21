import { createHash } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';

const CHECKOUT_URL = 'https://www.liqpay.ua/api/3/checkout';

@Injectable()
export class LiqpayService {
  private readonly logger = new Logger(LiqpayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private publicKey() {
    return this.config.get<string>('LIQPAY_PUBLIC_KEY') || '';
  }

  private privateKey() {
    return this.config.get<string>('LIQPAY_PRIVATE_KEY') || '';
  }

  private resultUrl(orderId: string) {
    const base =
      this.config.get<string>('LIQPAY_RESULT_URL') ||
      this.config.get<string>('WAYFORPAY_RETURN_URL') ||
      'http://localhost:3001/order-success';
    const url = new URL(base);
    url.searchParams.set('orderId', orderId);
    return url.toString();
  }

  private serverUrl() {
    return (
      this.config.get<string>('LIQPAY_SERVER_URL') ||
      'http://localhost:3000/api/liqpay/callback'
    );
  }

  private encodeData(payload: Record<string, unknown>) {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  }

  private sign(data: string) {
    const privateKey = this.privateKey();
    return createHash('sha1')
      .update(privateKey + data + privateKey)
      .digest('base64');
  }

  async buildPaymentForm(orderId: string) {
    if (!orderId?.trim()) {
      throw new BadRequestException('order_id required');
    }

    const publicKey = this.publicKey();
    const privateKey = this.privateKey();
    if (!publicKey || !privateKey) {
      throw new BadRequestException(
        'LIQPAY_PUBLIC_KEY / LIQPAY_PRIVATE_KEY не налаштовано',
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

    if (order.paymentMethod !== 'liqpay' || !order.paymentStatus) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentMethod: 'liqpay',
          paymentStatus: order.paymentStatus || 'PENDING',
        },
      });
    }

    const payload = {
      public_key: publicKey,
      version: 3,
      action: 'pay',
      amount,
      currency: 'UAH',
      description: description.slice(0, 250),
      order_id: order.id,
      result_url: this.resultUrl(order.id),
      server_url: this.serverUrl(),
      language: 'uk',
    };

    const data = this.encodeData(payload);
    const signature = this.sign(data);

    return {
      action: CHECKOUT_URL,
      fields: {
        data,
        signature,
      },
    };
  }

  async handleCallback(body: Record<string, unknown>) {
    const data = String(body.data || '');
    const signature = String(body.signature || '');

    if (!data || !signature) {
      throw new BadRequestException('data and signature required');
    }

    const expected = this.sign(data);
    if (expected !== signature) {
      this.logger.warn(`Invalid LiqPay signature`);
      throw new BadRequestException('Invalid signature');
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(
        Buffer.from(data, 'base64').toString('utf8'),
      ) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('Invalid data payload');
    }

    const orderId = String(parsed.order_id || '');
    const status = String(parsed.status || '').toLowerCase();

    if (!orderId) {
      throw new BadRequestException('order_id required');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const approved =
      status === 'success' || status === 'sandbox' || status === 'wait_accept';
    const declined =
      status === 'failure' ||
      status === 'error' ||
      status === 'reversed' ||
      status === 'expired';

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: 'liqpay',
        paymentStatus: approved
          ? status === 'wait_accept'
            ? 'PENDING'
            : 'PAID'
          : declined
            ? 'FAILED'
            : 'PENDING',
        status:
          approved && status !== 'wait_accept' ? 'PAID' : order.status,
      },
    });

    this.logger.log(`LiqPay callback ${orderId}: ${status}`);

    return { ok: true };
  }
}
