import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateReviewDto } from './dto/create-review.dto';

// Тимчасове рішення: дефолтне фото для карток, поки не налаштовані
// завантаження/прив’язка зображень для кожного товару окремо.
const TEMP_DEFAULT_PRODUCT_IMAGE_URL =
  'https://res.cloudinary.com/dhcqvesyr/image/upload/v1777366777/Rectangle_4_rbucbx.png';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private withDefaultImage<T extends { mainImageUrl?: string | null }>(
    item: T,
  ): T {
    if (item.mainImageUrl) return item;
    return { ...item, mainImageUrl: TEMP_DEFAULT_PRODUCT_IMAGE_URL };
  }

  async getCategories() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            filters: {
              orderBy: { order: 'asc' },
              include: {
                values: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
        filters: {
          orderBy: { order: 'asc' },
          include: {
            values: { orderBy: { order: 'asc' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getProducts(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { shortDescription: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.categorySlug) {
      where.categories = {
        some: {
          category: {
            slug: query.categorySlug,
          },
        },
      };
    }

    // Фільтри за значеннями (cannabinoid, manufacturer, type, material тощо)
    const filterParams = [
      { key: 'cannabinoid' as const, val: query.cannabinoid },
      { key: 'manufacturer' as const, val: query.manufacturer },
      { key: 'type' as const, val: query.type },
      { key: 'material' as const, val: query.material },
    ] as const;
    const filterConditions: any[] = [];
    for (const { key, val } of filterParams) {
      if (!val?.trim()) continue;
      const slugs = val
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (slugs.length === 0) continue;
      filterConditions.push({
        filterValues: {
          some: {
            filterValue: {
              slug: { in: slugs },
              filter: { slug: key },
            },
          },
        },
      });
    }
    if (filterConditions.length > 0) {
      where.AND = where.AND
        ? [...where.AND, ...filterConditions]
        : filterConditions;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((p) => this.withDefaultImage(p)),
      page,
      limit,
      total,
      pages,
    };
  }

  async getProductBySlugOrId(slugOrId: string) {
    let product = await this.prisma.product.findUnique({
      where: { slug: slugOrId },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        characteristics: {
          orderBy: { order: 'asc' },
        },
        descriptionBlocks: {
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!product) {
      product = await this.prisma.product.findUnique({
        where: { id: slugOrId },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          characteristics: {
            orderBy: { order: 'asc' },
          },
          descriptionBlocks: {
            orderBy: { order: 'asc' },
          },
        },
      });
    }
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return {
      ...this.withDefaultImage(product),
      categories: product.categories.map((pc) => pc.category),
    };
  }

  /** @deprecated Use getProductBySlugOrId */
  async getProductBySlug(slug: string) {
    return this.getProductBySlugOrId(slug);
  }

  async getReviews(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const reviews = await this.prisma.review.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: 'desc' },
    });

    const total = reviews.length;
    const ratingAverage =
      total === 0 ? 0 : reviews.reduce((sum, r) => sum + r.rating, 0) / total;

    return {
      items: reviews,
      total,
      ratingAverage,
    };
  }

  async addReview(slug: string, data: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const review = await this.prisma.review.create({
      data: {
        productId: product.id,
        rating: data.rating,
        title: data.title,
        text: data.text,
        authorName: data.authorName,
      },
    });

    const agg = await this.prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.product.update({
      where: { id: product.id },
      data: {
        ratingAverage: agg._avg.rating ?? 0,
        ratingCount: agg._count.rating,
      },
    });

    return review;
  }
}
