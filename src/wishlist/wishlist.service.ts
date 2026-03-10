import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

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

  async syncWishlist(
    userId: string,
    items: Array<{ productId?: string; slug?: string }>,
  ) {
    try {
      const validIds: string[] = [];
      for (const item of items) {
        let productId: string | null = null;
        if (item.productId) {
          const p = await this.prisma.product.findUnique({
            where: { id: item.productId },
            select: { id: true },
          });
          productId = p?.id ?? null;
        }
        if (!productId && item.slug) {
          const p = await this.prisma.product.findUnique({
            where: { slug: item.slug },
            select: { id: true },
          });
          productId = p?.id ?? null;
        }
        if (productId && !validIds.includes(productId)) {
          validIds.push(productId);
        }
      }

      if (items.length > 0 && validIds.length === 0) {
        this.logger.warn(
          `[Wishlist Sync] Отримано ${items.length} item(s), жоден не знайдено в каталозі. ` +
            `Приклад: ${JSON.stringify(items.slice(0, 2))}`,
        );
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.userWishlist.deleteMany({ where: { userId } });
        if (validIds.length > 0) {
          await tx.userWishlist.createMany({
            data: validIds.map((productId) => ({ userId, productId })),
          });
        }
      });

      return this.getWishlist(userId);
    } catch (err) {
      this.logger.error('Wishlist sync failed', err);
      throw err;
    }
  }
}
