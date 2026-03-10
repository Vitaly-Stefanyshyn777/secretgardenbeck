import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto) {
    if (!dto.termsAccepted) {
      throw new BadRequestException('Необхідно прийняти умови оферти');
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
    const discount = dto.discountAmount ?? 0;
    const delivery = dto.deliveryCost ?? 0;
    const total = Math.max(0, subtotal - discount + delivery);

    const order = await this.prisma.$transaction(async (tx) => {
      const ord = await tx.order.create({
        data: {
          userId,
          total,
          firstName: dto.firstName,
          lastName: dto.lastName,
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
      await tx.cartItem.deleteMany({ where: { userId } });
      return ord;
    });

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
    const paymentLabel =
      order.deliveryMethod === 'nova_poshta'
        ? 'За тарифами "Нової Пошти"'
        : order.deliveryMethod ?? 'Не вказано';
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
        product: i.product,
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
