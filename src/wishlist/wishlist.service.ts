import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

// Тимчасове рішення: дефолтне фото для карток, поки не налаштовані
// завантаження/прив’язка зображень для кожного товару окремо.
const TEMP_DEFAULT_PRODUCT_IMAGE_URL =
  'https://res.cloudinary.com/dhcqvesyr/image/upload/v1777366777/Rectangle_4_rbucbx.png';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(private readonly prisma: PrismaService) {}

  private withDefaultImage<T extends { mainImageUrl?: string | null }>(item: T): T {
    if (item.mainImageUrl) return item;
    return { ...item, mainImageUrl: TEMP_DEFAULT_PRODUCT_IMAGE_URL };
  }

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
          ...this.withDefaultImage(i.product),
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
