import { createHmac } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';

const PAY_URL = 'https://secure.wayforpay.com/pay';

@Injectable()
export class WayforpayService {
  private readonly logger = new Logger(WayforpayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private merchantAccount() {
    return (
      this.config.get<string>('WAYFORPAY_MERCHANT_ACCOUNT') || 'test_merch_n1'
    );
  }

  private secretKey() {
    return (
      this.config.get<string>('WAYFORPAY_SECRET_KEY') ||
      'flk3409refn54t54t*FNJRET'
    );
  }

  private domain() {
    return (
      this.config.get<string>('WAYFORPAY_DOMAIN') ||
      'localhost'
    );
  }

  private returnUrl(orderId: string) {
    const base =
      this.config.get<string>('WAYFORPAY_RETURN_URL') ||
      'http://localhost:3001/order-success';
    const url = new URL(base);
    url.searchParams.set('orderId', orderId);
    return url.toString();
  }

  private serviceUrl() {
    return (
      this.config.get<string>('WAYFORPAY_SERVICE_URL') ||
      'http://localhost:3000/api/wayforpay/callback'
    );
  }

  sign(parts: Array<string | number>) {
    const str = parts.map(String).join(';');
    return createHmac('md5', this.secretKey()).update(str, 'utf8').digest('hex');
  }

  async buildPaymentForm(orderId: string) {
    if (!orderId?.trim()) {
      throw new BadRequestException('order_id required');
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

    const productName = order.items.map(
      (i) => i.product?.name || `Товар ${i.productId}`,
    );
    const productCount = order.items.map((i) => i.quantity);
    const productPrice = order.items.map((i) => Number(i.price));

    const amount = Math.round(Number(order.total) * 100) / 100;
    const currency = 'UAH';
    const itemsSum = productPrice.reduce(
      (s, p, idx) => s + p * (productCount[idx] || 0),
      0,
    );

    // Знижка/доставка змінюють total — для WFP сума рядків має збігатися з amount
    if (
      productName.length === 0 ||
      Math.abs(itemsSum - amount) > 0.01
    ) {
      productName.length = 0;
      productCount.length = 0;
      productPrice.length = 0;
      productName.push(`Замовлення ${order.id}`);
      productCount.push(1);
      productPrice.push(amount);
    }

    const orderDate = Math.floor(new Date(order.createdAt).getTime() / 1000);
    const merchantAccount = this.merchantAccount();
    const merchantDomainName = this.domain();
    const orderReference = order.id;

    const signature = this.sign([
      merchantAccount,
      merchantDomainName,
      orderReference,
      orderDate,
      amount,
      currency,
      ...productName,
      ...productCount,
      ...productPrice,
    ]);

    if (order.paymentMethod !== 'wayforpay' || !order.paymentStatus) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentMethod: order.paymentMethod || 'wayforpay',
          paymentStatus: order.paymentStatus || 'PENDING',
        },
      });
    }

    const fields: Record<string, unknown> = {
      merchantAccount,
      merchantAuthType: 'SimpleSignature',
      merchantDomainName,
      merchantSignature: signature,
      merchantTransactionSecureType: 'AUTO',
      orderReference,
      orderDate,
      amount,
      currency,
      orderTimeout: 49000,
      productName,
      productCount,
      productPrice,
      clientFirstName: order.firstName || '',
      clientLastName: order.lastName || '',
      clientEmail: order.email || '',
      clientPhone: order.phone || '',
      language: 'UA',
      returnUrl: this.returnUrl(order.id),
      serviceUrl: this.serviceUrl(),
    };

    return {
      action: PAY_URL,
      fields,
    };
  }

  async handleCallback(body: Record<string, unknown>) {
    const orderReference = String(body.orderReference || '');
    const amount = body.amount;
    const currency = String(body.currency || '');
    const authCode = String(body.authCode || '');
    const cardPan = String(body.cardPan || '');
    const transactionStatus = String(body.transactionStatus || '');
    const reasonCode = String(body.reasonCode ?? '');
    const merchantAccount = String(body.merchantAccount || '');
    const merchantSignature = String(body.merchantSignature || '');

    if (!orderReference) {
      throw new BadRequestException('orderReference required');
    }

    const expected = this.sign([
      merchantAccount,
      orderReference,
      amount as string | number,
      currency,
      authCode,
      cardPan,
      transactionStatus,
      reasonCode,
    ]);

    if (
      merchantSignature &&
      expected.toLowerCase() !== merchantSignature.toLowerCase()
    ) {
      this.logger.warn(`Invalid WayForPay signature for ${orderReference}`);
      throw new BadRequestException('Invalid signature');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderReference },
    });
    if (!order) throw new NotFoundException('Order not found');

    const approved = transactionStatus.toLowerCase() === 'approved';
    const declined =
      transactionStatus.toLowerCase() === 'declined' ||
      transactionStatus.toLowerCase() === 'expired' ||
      transactionStatus.toLowerCase() === 'refunded';

    await this.prisma.order.update({
      where: { id: orderReference },
      data: {
        paymentMethod: 'wayforpay',
        paymentStatus: approved ? 'PAID' : declined ? 'FAILED' : 'PENDING',
        status: approved ? 'PAID' : order.status,
      },
    });

    this.logger.log(
      `WayForPay callback ${orderReference}: ${transactionStatus}`,
    );

    const time = Math.floor(Date.now() / 1000);
    const status = 'accept';
    const signature = this.sign([orderReference, status, time]);

    return {
      orderReference,
      status,
      time,
      signature,
    };
  }
}
