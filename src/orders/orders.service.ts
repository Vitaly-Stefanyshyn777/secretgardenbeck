import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateOrderDto } from './dto/create-order.dto';
import { MailService } from '../mail/mail.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import {
  COURIER_UNAVAILABLE_MESSAGE,
  isCourierDeliveryAvailable,
  isCourierDeliveryMethod,
} from './courier-delivery-hours';

// Тимчасове рішення: дефолтне фото для карток, поки не налаштовані
// завантаження/прив’язка зображень для кожного товару окремо.
const TEMP_DEFAULT_PRODUCT_IMAGE_URL =
  'https://res.cloudinary.com/dhcqvesyr/image/upload/v1777366777/Rectangle_4_rbucbx.png';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly promoCodes: PromoCodesService,
  ) {}

  private withDefaultImage<T extends { mainImageUrl?: string | null }>(item: T): T {
    if (item.mainImageUrl) return item;
    return { ...item, mainImageUrl: TEMP_DEFAULT_PRODUCT_IMAGE_URL };
  }

  async create(userId: string, dto: CreateOrderDto) {
    if (!dto.termsAccepted) {
      throw new BadRequestException('Необхідно прийняти умови оферти');
    }

    if (
      isCourierDeliveryMethod(dto.deliveryMethod) &&
      !isCourierDeliveryAvailable()
    ) {
      throw new BadRequestException(COURIER_UNAVAILABLE_MESSAGE);
    }

    let items: { productId: string; quantity: number }[];
    if (Array.isArray(dto.items) && dto.items.length > 0) {
      items = dto.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      }));
    } else {
      const cart = await this.prisma.cartItem.findMany({
        where: { userId },
        include: { product: { select: { id: true, price: true } } },
      });
      items = cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      }));
    }

    if (items.length === 0) {
      throw new BadRequestException('Кошик порожній');
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      select: { id: true, price: true },
    });
    const priceMap = new Map(products.map((p) => [p.id, Number(p.price)]));

    const orderItems: { productId: string; quantity: number; price: number }[] =
      [];
    for (const item of items) {
      const price = priceMap.get(item.productId);
      if (!price || item.quantity < 1) continue;
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price,
      });
    }

    if (orderItems.length === 0) {
      throw new BadRequestException('Немає валідних товарів для замовлення');
    }

    const subtotal = orderItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );
    const saleDiscount = dto.discountAmount ?? 0;
    let promoDiscount = 0;
    let promoId: string | null = null;
    let promoCodeValue: string | null = null;

    if (dto.promoCode?.trim()) {
      const promo = await this.promoCodes.assertValid(dto.promoCode, userId);
      const base = Math.max(0, subtotal - saleDiscount);
      promoDiscount = Math.round((base * promo.discountPercent) / 100);
      promoId = promo.id;
      promoCodeValue = promo.code;
    }

    const discount = saleDiscount + promoDiscount;
    const delivery = dto.deliveryCost ?? 0;
    const total = Math.max(0, subtotal - discount + delivery);

    const order = await this.prisma.$transaction(async (tx) => {
      const ord = await tx.order.create({
        data: {
          userId,
          total,
          firstName: dto.firstName,
          lastName: dto.lastName,
          middleName: dto.middleName,
          phone: dto.phone,
          email: dto.email,
          recipientFirstName: dto.recipientFirstName,
          recipientLastName: dto.recipientLastName,
          recipientPhone: dto.recipientPhone,
          deliveryMethod: dto.deliveryMethod,
          deliveryCity: dto.deliveryCity,
          deliveryAddress: dto.deliveryAddress,
          comment: dto.comment,
          newsletterConsent: dto.newsletterConsent ?? false,
          termsAccepted: dto.termsAccepted,
          discountAmount: discount,
          deliveryCost: delivery,
          paymentMethod: dto.paymentMethod,
          paymentStatus: dto.paymentMethod === 'wayforpay' ? 'PENDING' : null,
          promoCode: promoCodeValue,
          items: {
            create: orderItems.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              price: i.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  mainImageUrl: true,
                },
              },
            },
          },
        },
      });
      if (promoId) {
        await this.promoCodes.recordUsage(tx, promoId, userId, ord.id);
      }
      await tx.cartItem.deleteMany({ where: { userId } });
      return ord;
    });

    void this.mail
      .sendOrderCreated({
        id: order.id,
        createdAt: order.createdAt,
        firstName: order.firstName,
        lastName: order.lastName,
        phone: order.phone,
        email: order.email,
        total: Number(order.total),
        deliveryMethod: order.deliveryMethod,
        deliveryCity: order.deliveryCity,
        deliveryAddress: order.deliveryAddress,
        comment: order.comment,
        items: (order.items ?? []).map((i) => ({
          name: i.product?.name || i.productId,
          quantity: i.quantity,
          price: Number(i.price),
        })),
      })
      .catch((err) =>
        this.logger.error(
          'Order notify email failed',
          err instanceof Error ? err.stack : String(err),
        ),
      );

    return this.formatOrderResponse(order, subtotal);
  }

  private formatOrderResponse(order: any, subtotal?: number) {
    const sub = subtotal ?? order.items?.reduce(
      (s: number, i: any) => s + Number(i.price) * i.quantity,
      0,
    ) ?? 0;
    const recipient =
      order.recipientFirstName || order.recipientLastName
        ? `${order.recipientFirstName ?? ''} ${order.recipientLastName ?? ''}`.trim() || 'Одержувач не вказаний'
        : 'Одержувач не вказаний';
    const deliveryAddress =
      order.deliveryCity || order.deliveryAddress
        ? [order.deliveryCity, order.deliveryAddress].filter(Boolean).join(', ')
        : 'Відділення не вказано';
    const paymentLabels: Record<string, string> = {
      wayforpay: 'Онлайн-оплата WayForPay',
      cod: 'Накладений платіж',
      bacs: 'Оплата на рахунок',
    };
    const deliveryLabels: Record<string, string> = {
      courier: 'Курʼєр (Uklon)',
      uklon: 'Курʼєр (Uklon)',
      nova_poshta: 'Нова Пошта',
    };
    const paymentLabel =
      (order.paymentMethod && paymentLabels[order.paymentMethod]) ||
      order.paymentMethod ||
      'Не вказано';
    const deliveryLabel =
      (order.deliveryMethod && deliveryLabels[order.deliveryMethod]) ||
      order.deliveryMethod ||
      'Не вказано';
    const phoneLabel = order.phone || order.recipientPhone || 'Телефон не вказано';

    return {
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      firstName: order.firstName,
      lastName: order.lastName,
      phone: order.phone,
      phoneLabel,
      email: order.email,
      recipient,
      recipientFirstName: order.recipientFirstName,
      recipientLastName: order.recipientLastName,
      recipientPhone: order.recipientPhone,
      deliveryMethod: order.deliveryMethod,
      deliveryMethodLabel: deliveryLabel,
      deliveryAddress,
      deliveryCity: order.deliveryCity,
      comment: order.comment,
      subtotal: sub,
      discountAmount: Number(order.discountAmount ?? 0),
      deliveryCost: Number(order.deliveryCost ?? 0),
      total: Number(order.total),
      paymentLabel,
      items: order.items?.map((i: any) => ({
        productId: i.productId,
        quantity: i.quantity,
        price: Number(i.price),
        product: i.product ? this.withDefaultImage(i.product) : i.product,
      })) ?? [],
    };
  }

  async findById(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: { include: { product: true } },
      },
    });
    if (!order) {
      throw new NotFoundException('Замовлення не знайдено');
    }
    return this.formatOrderResponse(order);
  }

  async findByUser(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.formatOrderResponse(o));
  }
}
