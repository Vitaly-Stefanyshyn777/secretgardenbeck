import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            categories: { include: { category: true } },
          },
        },
      },
    });

    return {
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        product: {
          ...i.product,
          categories: i.product.categories.map((pc) => pc.category),
        },
      })),
    };
  }

  async syncCart(userId: string, items: { productId: string; quantity?: number }[]) {
    const valid: { productId: string; quantity: number }[] = [];
    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true },
      });
      if (product && (item.quantity ?? 1) > 0) {
        valid.push({ productId: item.productId, quantity: item.quantity ?? 1 });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { userId } });
      if (valid.length > 0) {
        for (const { productId, quantity } of valid) {
          await tx.cartItem.upsert({
            where: {
              userId_productId: { userId, productId },
            },
            create: { userId, productId, quantity },
            update: { quantity },
          });
        }
      }
    });

    return this.getCart(userId);
  }
}
