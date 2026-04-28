import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

// Тимчасове рішення: дефолтне фото для карток, поки не налаштовані
// завантаження/прив’язка зображень для кожного товару окремо.
const TEMP_DEFAULT_PRODUCT_IMAGE_URL =
  'https://res.cloudinary.com/dhcqvesyr/image/upload/v1777366777/Rectangle_4_rbucbx.png';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(private readonly prisma: PrismaService) {}

  private withDefaultImage<T extends { mainImageUrl?: string | null }>(item: T): T {
    if (item.mainImageUrl) return item;
    return { ...item, mainImageUrl: TEMP_DEFAULT_PRODUCT_IMAGE_URL };
  }

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

    const mapped = items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      name: i.product.name,
      price: Number(i.product.price),
      mainImageUrl:
        i.product.mainImageUrl ?? TEMP_DEFAULT_PRODUCT_IMAGE_URL,
      product: {
        ...this.withDefaultImage(i.product),
        categories: i.product.categories.map((pc) => pc.category),
      },
    }));

    const total = mapped.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );
    const currency = items[0]?.product?.currency ?? 'UAH';

    return {
      items: mapped,
      items_count: mapped.length,
      total,
      currency,
    };
  }

  async syncCart(
    userId: string,
    items: Array<{ productId?: string; slug?: string; quantity?: number }>,
  ) {
    try {
      const valid: { productId: string; quantity: number }[] = [];
      for (const item of items) {
        const qty = item.quantity ?? 1;
        if (qty < 1) continue;

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
        if (productId) {
          valid.push({ productId, quantity: qty });
        }
      }

      if (items.length > 0 && valid.length === 0) {
        this.logger.warn(
          `[Cart Sync] Отримано ${items.length} item(s), жоден не знайдено в каталозі. ` +
            `Приклад: ${JSON.stringify(items.slice(0, 2))}`,
        );
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
    } catch (err) {
      this.logger.error('Cart sync failed', err);
      throw err;
    }
  }
}
