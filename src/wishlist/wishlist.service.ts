import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getWishlist(userId: string) {
    const items = await this.prisma.userWishlist.findMany({
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
        product: {
          ...i.product,
          categories: i.product.categories.map((pc) => pc.category),
        },
      })),
      productIds: items.map((i) => i.productId),
    };
  }

  async syncWishlist(userId: string, productIds: string[]) {
    const existing = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    const validIds = existing.map((p) => p.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.userWishlist.deleteMany({ where: { userId } });
      if (validIds.length > 0) {
        await tx.userWishlist.createMany({
          data: validIds.map((productId) => ({ userId, productId })),
        });
      }
    });

    return this.getWishlist(userId);
  }
}
