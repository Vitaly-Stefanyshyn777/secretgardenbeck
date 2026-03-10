import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class ViewedService {
  constructor(private readonly prisma: PrismaService) {}

  async addViewed(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.userViewedProduct.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      create: { userId, productId },
      update: { viewedAt: new Date() },
    });
    return { success: true };
  }

  async getViewed(userId: string, limit = 12) {
    const records = await this.prisma.userViewedProduct.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      take: limit,
      include: {
        product: {
          include: {
            categories: { include: { category: true } },
          },
        },
      },
    });

    const items = records.map((r) => ({
      ...r.product,
      categories: r.product.categories.map((pc) => pc.category),
      viewedAt: r.viewedAt,
    }));

    return { items };
  }

  async syncViewed(userId: string, productIds: string[]) {
    const existing = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    const validIds = existing.map((p) => p.id);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      for (const productId of validIds) {
        await tx.userViewedProduct.upsert({
          where: {
            userId_productId: { userId, productId },
          },
          create: { userId, productId, viewedAt: now },
          update: { viewedAt: now },
        });
      }
    });

    return { success: true, synced: validIds.length };
  }
}
