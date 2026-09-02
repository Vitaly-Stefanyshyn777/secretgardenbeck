import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import {
  AppLocale,
  localizeCategoryRecord,
  localizeProductRecord,
} from '../common/i18n/localized-fields';
import { decodeSlugParam } from '../common/utils/slug.utils';

// Тимчасове рішення: дефолтне фото для карток, поки не налаштовані
// завантаження/прив’язка зображень для кожного товару окремо.
const TEMP_DEFAULT_PRODUCT_IMAGE_URL =
  'https://res.cloudinary.com/dhcqvesyr/image/upload/v1777366777/Rectangle_4_rbucbx.png';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** true = 18+ підтверджено, false = відмова, null/undefined = ще не відповів */
  private applyAgeRestriction(
    where: Record<string, unknown>,
    ageVerified?: boolean | null,
  ) {
    if (ageVerified === true) return;
    const cond = { ageRestricted: false };
    if (Array.isArray(where.AND)) {
      where.AND = [...where.AND, cond];
    } else {
      where.AND = [cond];
    }
  }

  private isProductAccessible(
    ageRestricted: boolean,
    ageVerified?: boolean | null,
  ) {
    if (!ageRestricted) return true;
    return ageVerified === true;
  }

  private withDefaultImage<T extends {
    mainImageUrl?: string | null;
    imageUrls?: string[];
  }>(item: T): T & { imageUrls: string[] } {
    const urls =
      item.imageUrls && item.imageUrls.length > 0
        ? item.imageUrls
        : item.mainImageUrl
          ? [item.mainImageUrl]
          : [TEMP_DEFAULT_PRODUCT_IMAGE_URL];

    return {
      ...item,
      mainImageUrl: item.mainImageUrl || urls[0],
      imageUrls: urls,
    };
  }

  async getCategories(locale: AppLocale = 'uk') {
    const rows = await this.prisma.category.findMany({
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
    return rows.map((c) =>
      localizeCategoryRecord(
        c as Parameters<typeof localizeCategoryRecord>[0],
        locale,
      ),
    );
  }

  async getProducts(
    query: ProductQueryDto,
    locale: AppLocale = 'uk',
    ageVerified?: boolean | null,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    if (ageVerified === false) {
      return {
        items: [],
        page,
        limit,
        total: 0,
        pages: 0,
      };
    }

    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { nameEn: { contains: query.search, mode: 'insensitive' } },
        { nameUk: { contains: query.search, mode: 'insensitive' } },
        { shortDescription: { contains: query.search, mode: 'insensitive' } },
        {
          shortDescriptionEn: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          shortDescriptionUk: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
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

    this.applyAgeRestriction(where, ageVerified);

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
      items: items.map((p) =>
        localizeProductRecord(this.withDefaultImage(p) as Record<string, unknown>, locale),
      ),
      page,
      limit,
      total,
      pages,
    };
  }

  async getProductBySlugOrId(
    slugOrId: string,
    locale: AppLocale = 'uk',
    ageVerified?: boolean | null,
  ) {
    const decoded = decodeSlugParam(slugOrId);
    const lookupKeys = Array.from(
      new Set([decoded, slugOrId.trim()].filter(Boolean)),
    );

    let product = null as Awaited<
      ReturnType<typeof this.prisma.product.findUnique>
    >;

    for (const key of lookupKeys) {
      if (!key) continue;
      product = await this.prisma.product.findUnique({
        where: { slug: key },
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
      if (product) break;
    }

    if (!product) {
      product = await this.prisma.product.findUnique({
        where: { id: decoded || slugOrId.trim() },
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
    if (
      !this.isProductAccessible(
        Boolean((product as { ageRestricted?: boolean }).ageRestricted),
        ageVerified,
      )
    ) {
      throw new NotFoundException('Product not found');
    }
    const withImage = {
      ...this.withDefaultImage(product),
      categories: product.categories.map((pc) => pc.category),
    };
    return localizeProductRecord(withImage as Record<string, unknown>, locale);
  }

  async getAllReviews(limit = 50, locale: AppLocale = 'uk') {
    const take = Math.min(Math.max(limit, 1), 100);
    const reviews = await this.prisma.review.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { name: true, slug: true } },
      },
    });

    return {
      items: reviews.map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: localizeProductRecord(
          r.product as Record<string, unknown>,
          locale,
        ).name as string,
        productSlug: r.product.slug,
        rating: r.rating,
        title: r.title,
        text: r.text,
        authorName: r.authorName,
        createdAt: r.createdAt,
      })),
      total: reviews.length,
    };
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
