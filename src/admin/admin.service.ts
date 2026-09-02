import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { AuthService } from '../auth/auth.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  CreateAdminCategoryDto,
  CreateAdminProductDto,
  UpdateAdminCategoryDto,
  UpdateAdminOrderStatusDto,
  UpdateAdminProductDto,
  UpdateAdminUserRoleDto,
  UpdateContactSettingsDto,
  UpsertAboutBlockDto,
  UpsertBannerDto,
  UpsertFaqItemDto,
} from './dto/admin.dto';
import {
  AppLocale,
  localizeAboutRecord,
  localizeBannerRecord,
  localizeContactsRecord,
  localizeFaqRecord,
  resolveCategoryI18nInput,
  resolveProductI18nInput,
} from '../common/i18n/localized-fields';
import { normalizeProductSlug } from '../common/utils/slug.utils';

/** Той самий fallback, що в CatalogService / CartService */
const TEMP_DEFAULT_PRODUCT_IMAGE_URL =
  'https://res.cloudinary.com/dhcqvesyr/image/upload/v1777366777/Rectangle_4_rbucbx.png';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async login(email: string, password: string) {
    const tokens = await this.authService.login(
      { email: email.toLowerCase() },
      password,
    );
    const user = await this.authService.getUserFromToken(tokens.accessToken);

    if (!user || user.role !== Role.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstname: user.firstname,
        lastname: user.lastname,
      },
    };
  }

  async me(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstname: user.firstname,
      lastname: user.lastname,
    };
  }

  async uploadImage(dataUri: string) {
    return this.cloudinary.uploadDataUri(dataUri, 'secretgarden/products');
  }

  async uploadPdf(dataUri: string) {
    return this.cloudinary.uploadRawDataUri(
      dataUri,
      'secretgarden/certificates',
    );
  }

  /** Як у catalog: imageUrls → mainImageUrl → дефолт Cloudinary */
  private withDefaultImage<T extends {
    mainImageUrl?: string | null;
    imageUrls?: string[];
  }>(item: T): T & { imageUrls: string[]; mainImageUrl: string } {
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

  private normalizeImageFields(dto: {
    mainImageUrl?: string | null;
    imageUrls?: string[];
  }) {
    const imageUrls = (dto.imageUrls ?? []).filter(Boolean);
    const mainImageUrl =
      dto.mainImageUrl !== undefined
        ? dto.mainImageUrl
        : imageUrls[0] ?? null;
    return {
      imageUrls,
      mainImageUrl: mainImageUrl || imageUrls[0] || null,
    };
  }

  private async resolveUniqueProductSlug(
    slug: string | undefined | null,
    fallbackName: string,
    excludeProductId?: string,
  ): Promise<string> {
    let base = normalizeProductSlug(slug, fallbackName);
    if (!base) {
      throw new BadRequestException('Slug is required');
    }

    let candidate = base;
    let suffix = 2;
    while (true) {
      const existing = await this.prisma.product.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing || existing.id === excludeProductId) {
        return candidate;
      }
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
  }

  /** Привʼязка категорії + підкатегорії до товару (для фільтрів на сайті). */
  private resolveCategoryLinkIds(
    categoryId?: string | null,
    subcategoryId?: string | null,
  ): string[] {
    const ids = [categoryId, subcategoryId].filter(
      (id): id is string => !!id && id.trim() !== '',
    );
    return [...new Set(ids)];
  }

  private mapProductCategories(
    product: {
      categories?: Array<{
        category: {
          id: string;
          name: string;
          slug: string;
          parentId: string | null;
          parent?: { id: string; name: string; slug: string } | null;
        };
      }>;
    },
  ) {
    const linked = product.categories?.map((pc) => pc.category) ?? [];
    const sub = linked.find((c) => !!c.parentId);
    const category =
      (sub
        ? linked.find((c) => c.id === sub.parentId) || sub.parent || null
        : null) ??
      linked.find((c) => !c.parentId) ??
      null;

    return {
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? null,
      subcategoryId: sub?.id ?? null,
      subcategoryName: sub?.name ?? null,
    };
  }

  async listProducts() {
    const items = await this.prisma.product.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        categories: {
          include: { category: { include: { parent: true } } },
        },
      },
    });
    return items.map((p) => ({
      ...this.withDefaultImage(p),
      ...this.mapProductCategories(p),
    }));
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        categories: {
          include: { category: { include: { parent: true } } },
        },
        characteristics: { orderBy: { order: 'asc' } },
        descriptionBlocks: { orderBy: { order: 'asc' } },
        filterValues: {
          include: {
            filterValue: { include: { filter: true } },
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return {
      ...this.withDefaultImage(product),
      ...this.mapProductCategories(product),
      filterValueIds: product.filterValues.map((fv) => fv.filterValueId),
    };
  }

  async createProduct(dto: CreateAdminProductDto) {
    const images = this.normalizeImageFields(dto);
    const categoryIds = this.resolveCategoryLinkIds(
      dto.categoryId,
      dto.subcategoryId,
    );
    const i18n = resolveProductI18nInput(dto);
    const slug = await this.resolveUniqueProductSlug(dto.slug, i18n.name);

    return this.prisma.product.create({
      data: {
        name: i18n.name,
        nameEn: i18n.nameEn,
        nameUk: i18n.nameUk,
        slug,
        price: new Prisma.Decimal(dto.price),
        salePrice:
          dto.salePrice === undefined || dto.salePrice === null
            ? null
            : new Prisma.Decimal(dto.salePrice),
        currency: dto.currency ?? 'UAH',
        shortDescription: i18n.shortDescription,
        shortDescriptionEn: i18n.shortDescriptionEn,
        shortDescriptionUk: i18n.shortDescriptionUk,
        description: i18n.description,
        descriptionEn: i18n.descriptionEn,
        descriptionUk: i18n.descriptionUk,
        inStock: dto.inStock ?? true,
        stockQuantity: dto.stockQuantity ?? null,
        mainImageUrl: images.mainImageUrl,
        imageUrls: images.imageUrls,
        label: i18n.label,
        labelEn: i18n.labelEn,
        labelUk: i18n.labelUk,
        categories: categoryIds.length
          ? {
              create: categoryIds.map((categoryId) => ({ categoryId })),
            }
          : undefined,
        characteristics: dto.characteristics?.length
          ? {
              create: dto.characteristics.map((c, i) => ({
                name: c.name,
                value: c.value,
                order: c.order ?? i,
              })),
            }
          : undefined,
        descriptionBlocks: dto.descriptionBlocks?.length
          ? {
              create: dto.descriptionBlocks.map((b, i) => ({
                type: b.type,
                content: b.content,
                items: b.items ?? undefined,
                order: b.order ?? i,
              })),
            }
          : undefined,
        filterValues: dto.filterValueIds?.length
          ? {
              create: dto.filterValueIds.map((filterValueId) => ({
                filterValueId,
              })),
            }
          : undefined,
        ageRestricted: dto.ageRestricted ?? false,
      },
      include: {
        categories: {
          include: { category: { include: { parent: true } } },
        },
        characteristics: { orderBy: { order: 'asc' } },
        descriptionBlocks: { orderBy: { order: 'asc' } },
      },
    }).then((p) => ({
      ...this.withDefaultImage(p),
      ...this.mapProductCategories(p),
    }));
  }

  async updateProduct(id: string, dto: UpdateAdminProductDto) {
    const existing = await this.getProduct(id);
    const resolvedName =
      dto.name ?? (existing as { name?: string }).name ?? '';

    const data: Prisma.ProductUpdateInput = {
      ...(dto.name !== undefined
        ? {
            name: dto.name,
            nameUk: dto.nameUk ?? dto.name,
          }
        : dto.nameUk !== undefined
          ? { nameUk: dto.nameUk }
          : {}),
      ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn } : {}),
      ...(dto.slug !== undefined
        ? {
            slug: await this.resolveUniqueProductSlug(
              dto.slug,
              resolvedName,
              id,
            ),
          }
        : {}),
      ...(dto.price !== undefined
        ? { price: new Prisma.Decimal(dto.price) }
        : {}),
      ...(dto.salePrice !== undefined
        ? {
            salePrice:
              dto.salePrice === null
                ? null
                : new Prisma.Decimal(dto.salePrice),
          }
        : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.shortDescription !== undefined
        ? {
            shortDescription: dto.shortDescription,
            shortDescriptionUk:
              dto.shortDescriptionUk ?? dto.shortDescription,
          }
        : dto.shortDescriptionUk !== undefined
          ? { shortDescriptionUk: dto.shortDescriptionUk }
          : {}),
      ...(dto.shortDescriptionEn !== undefined
        ? { shortDescriptionEn: dto.shortDescriptionEn }
        : {}),
      ...(dto.description !== undefined
        ? {
            description: dto.description,
            descriptionUk: dto.descriptionUk ?? dto.description,
          }
        : dto.descriptionUk !== undefined
          ? { descriptionUk: dto.descriptionUk }
          : {}),
      ...(dto.descriptionEn !== undefined
        ? { descriptionEn: dto.descriptionEn }
        : {}),
      ...(dto.inStock !== undefined ? { inStock: dto.inStock } : {}),
      ...(dto.stockQuantity !== undefined
        ? { stockQuantity: dto.stockQuantity }
        : {}),
      ...(dto.label !== undefined
        ? {
            label: dto.label,
            labelUk: dto.labelUk ?? dto.label,
          }
        : dto.labelUk !== undefined
          ? { labelUk: dto.labelUk }
          : {}),
      ...(dto.labelEn !== undefined ? { labelEn: dto.labelEn } : {}),
      ...(dto.ageRestricted !== undefined
        ? { ageRestricted: dto.ageRestricted }
        : {}),
    };

    if (dto.imageUrls !== undefined || dto.mainImageUrl !== undefined) {
      const images = this.normalizeImageFields({
        mainImageUrl: dto.mainImageUrl,
        imageUrls: dto.imageUrls,
      });
      data.mainImageUrl = images.mainImageUrl;
      data.imageUrls = images.imageUrls;
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.characteristics) {
        await tx.productCharacteristic.deleteMany({ where: { productId: id } });
        if (dto.characteristics.length > 0) {
          await tx.productCharacteristic.createMany({
            data: dto.characteristics.map((c, i) => ({
              productId: id,
              name: c.name,
              value: c.value,
              order: c.order ?? i,
            })),
          });
        }
      }

      if (dto.descriptionBlocks) {
        await tx.productDescriptionBlock.deleteMany({
          where: { productId: id },
        });
        if (dto.descriptionBlocks.length > 0) {
          await tx.productDescriptionBlock.createMany({
            data: dto.descriptionBlocks.map((b, i) => ({
              productId: id,
              type: b.type,
              content: b.content,
              items: b.items ?? undefined,
              order: b.order ?? i,
            })),
          });
        }
      }

      if (dto.categoryId !== undefined || dto.subcategoryId !== undefined) {
        const categoryIds = this.resolveCategoryLinkIds(
          dto.categoryId,
          dto.subcategoryId,
        );
        await tx.productCategory.deleteMany({ where: { productId: id } });
        if (categoryIds.length > 0) {
          await tx.productCategory.createMany({
            data: categoryIds.map((categoryId) => ({
              productId: id,
              categoryId,
            })),
          });
        }
      }

      if (dto.filterValueIds !== undefined) {
        await tx.productFilterValue.deleteMany({ where: { productId: id } });
        if (dto.filterValueIds.length > 0) {
          await tx.productFilterValue.createMany({
            data: dto.filterValueIds.map((filterValueId) => ({
              productId: id,
              filterValueId,
            })),
          });
        }
      }

      const updated = await tx.product.update({
        where: { id },
        data,
        include: {
          categories: {
            include: { category: { include: { parent: true } } },
          },
          characteristics: { orderBy: { order: 'asc' } },
          descriptionBlocks: { orderBy: { order: 'asc' } },
        },
      });

      return {
        ...this.withDefaultImage(updated),
        ...this.mapProductCategories(updated),
      };
    });
  }

  async deleteProduct(id: string) {
    await this.getProduct(id);
    await this.prisma.product.delete({ where: { id } });
    return { ok: true };
  }

  listCategories() {
    const filterInclude = {
      orderBy: { order: 'asc' as const },
      include: {
        values: { orderBy: { order: 'asc' as const } },
      },
    };
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } },
        parent: true,
        filters: filterInclude,
        children: {
          orderBy: { name: 'asc' },
          include: {
            _count: { select: { products: true } },
            filters: filterInclude,
          },
        },
      },
    });
  }

  async getCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
        parent: true,
        children: {
          orderBy: { name: 'asc' },
          include: { _count: { select: { products: true } } },
        },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  createCategory(dto: CreateAdminCategoryDto) {
    const i18n = resolveCategoryI18nInput(dto);
    return this.prisma.category.create({
      data: {
        name: i18n.name,
        nameEn: i18n.nameEn,
        nameUk: i18n.nameUk,
        slug: dto.slug,
        parentId: dto.parentId ?? null,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateAdminCategoryDto) {
    await this.getCategory(id);
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined
          ? {
              name: dto.name,
              nameUk: dto.nameUk ?? dto.name,
            }
          : dto.nameUk !== undefined
            ? { nameUk: dto.nameUk }
            : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
      },
    });
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: { select: { id: true } },
        filters: { select: { id: true, values: { select: { id: true } } } },
      },
    });
    if (!category) throw new NotFoundException('Category not found');

    for (const child of category.children) {
      await this.deleteCategory(child.id);
    }

    const filterIds = category.filters.map((f) => f.id);
    const valueIds = category.filters.flatMap((f) => f.values.map((v) => v.id));

    await this.prisma.$transaction(async (tx) => {
      if (valueIds.length > 0) {
        await tx.productFilterValue.deleteMany({
          where: { filterValueId: { in: valueIds } },
        });
        await tx.categoryFilterValue.deleteMany({
          where: { id: { in: valueIds } },
        });
      }
      if (filterIds.length > 0) {
        await tx.categoryFilter.deleteMany({
          where: { id: { in: filterIds } },
        });
      }
      await tx.productCategory.deleteMany({ where: { categoryId: id } });
      await tx.category.delete({ where: { id } });
    });

    return { ok: true };
  }

  listOrders() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        user: {
          select: { id: true, email: true, firstname: true, lastname: true },
        },
      },
    });
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        user: {
          select: { id: true, email: true, firstname: true, lastname: true },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateOrderStatus(id: string, dto: UpdateAdminOrderStatusDto) {
    await this.getOrder(id);
    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserRole(id: string, dto: UpdateAdminUserRoleDto) {
    await this.getUser(id);
    return this.prisma.user.update({
      where: { id },
      data: { role: dto.role as Role },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
  }

  // ─── Content: Banners ───

  async listBanners(activeOnly = false) {
    return this.prisma.banner.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { order: 'asc' },
    });
  }

  async createBanner(dto: UpsertBannerDto) {
    if (!dto.imageUrl) throw new BadRequestException('imageUrl required');
    const count = await this.prisma.banner.count();
    return this.prisma.banner.create({
      data: {
        title: dto.title ?? '',
        titleEn: dto.titleEn ?? null,
        titleSub: dto.titleSub ?? null,
        titleSubEn: dto.titleSubEn ?? null,
        description: dto.description ?? '',
        descriptionEn: dto.descriptionEn ?? null,
        imageUrl: dto.imageUrl,
        mobileImageUrl: dto.mobileImageUrl ?? null,
        order: dto.order ?? count,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateBanner(id: string, dto: Partial<UpsertBannerDto>) {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Banner not found');
    return this.prisma.banner.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.titleEn !== undefined ? { titleEn: dto.titleEn } : {}),
        ...(dto.titleSub !== undefined ? { titleSub: dto.titleSub } : {}),
        ...(dto.titleSubEn !== undefined ? { titleSubEn: dto.titleSubEn } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.descriptionEn !== undefined
          ? { descriptionEn: dto.descriptionEn }
          : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.mobileImageUrl !== undefined
          ? { mobileImageUrl: dto.mobileImageUrl }
          : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteBanner(id: string) {
    await this.prisma.banner.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Banner not found');
    });
    return { ok: true };
  }

  // ─── Content: About ───

  async listAboutBlocks() {
    return this.prisma.aboutBlock.findMany({ orderBy: { order: 'asc' } });
  }

  async createAboutBlock(dto: UpsertAboutBlockDto) {
    const count = await this.prisma.aboutBlock.count();
    return this.prisma.aboutBlock.create({
      data: {
        title: dto.title,
        titleEn: dto.titleEn ?? null,
        body: dto.body ?? '',
        bodyEn: dto.bodyEn ?? null,
        imageUrl: dto.imageUrl ?? null,
        imageLeft: dto.imageLeft ?? true,
        buttonsLeft: dto.buttonsLeft ?? true,
        ctaLabel: dto.ctaLabel ?? null,
        ctaLabelEn: dto.ctaLabelEn ?? null,
        ctaUrl: dto.ctaUrl ?? null,
        links: (dto.links ?? []) as Prisma.InputJsonValue,
        textPadding: dto.textPadding ?? 0,
        textBlocks: (dto.textBlocks ?? null) as Prisma.InputJsonValue,
        order: dto.order ?? count,
      },
    });
  }

  async updateAboutBlock(id: string, dto: Partial<UpsertAboutBlockDto>) {
    const existing = await this.prisma.aboutBlock.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('About block not found');
    return this.prisma.aboutBlock.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.titleEn !== undefined ? { titleEn: dto.titleEn } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.bodyEn !== undefined ? { bodyEn: dto.bodyEn } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.imageLeft !== undefined ? { imageLeft: dto.imageLeft } : {}),
        ...(dto.buttonsLeft !== undefined ? { buttonsLeft: dto.buttonsLeft } : {}),
        ...(dto.ctaLabel !== undefined ? { ctaLabel: dto.ctaLabel } : {}),
        ...(dto.ctaLabelEn !== undefined ? { ctaLabelEn: dto.ctaLabelEn } : {}),
        ...(dto.ctaUrl !== undefined ? { ctaUrl: dto.ctaUrl } : {}),
        ...(dto.links !== undefined
          ? { links: dto.links as Prisma.InputJsonValue }
          : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.textPadding !== undefined ? { textPadding: dto.textPadding } : {}),
        ...(dto.textBlocks !== undefined
          ? { textBlocks: dto.textBlocks as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async deleteAboutBlock(id: string) {
    await this.prisma.aboutBlock.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('About block not found');
    });
    return { ok: true };
  }

  // ─── Content: FAQ ───

  private readonly defaultFaqItems = [
    {
      order: 0,
      title: 'Що таке CBD ?',
      titleEn: 'What is CBD?',
      body: [
        'CBD - це природна сполука, що міститься в рослині конопель. Він не має психоактивної дії та не викликає стану сп’яніння. CBD досліджують щодо можливого впливу на зниження стресу, покращення сну, загальне розслаблення.',
        'Ми пропонуємо лише легальну продукцію, яка відповідає чинному законодавству України.',
      ].join('\n\n'),
      bodyEn: [
        'CBD is a natural compound found in the hemp plant. It has no psychoactive effect and does not cause intoxication. CBD is studied for possible effects on stress reduction, sleep improvement, and general relaxation.',
        'We only offer legal products that comply with current Ukrainian legislation.',
      ].join('\n\n'),
      isSplit: false,
    },
    {
      order: 1,
      title: 'Чим CBD відрізняється від THC ?',
      titleEn: 'How is CBD different from THC?',
      body: [
        'CBD та THC - це різні компоненти рослини конопель, які по різному впливають на організм.',
        'THC має психоактивний ефект - тобто змінює стан свідомості та може викликати відчуття сп’яніння.',
        'CBD не має психоактивної дії та не викликає “ефекту ейфорії”. Його зазвичай обирають ті, хто шукає розслаблення без зміни свідомості.',
      ].join('\n\n'),
      bodyEn: [
        'CBD and THC are different compounds of the hemp plant that affect the body differently.',
        'THC has a psychoactive effect — it alters the state of consciousness and may cause a feeling of intoxication.',
        'CBD has no psychoactive effect and does not cause a “euphoria effect”. It is usually chosen by those who seek relaxation without altering consciousness.',
      ].join('\n\n'),
      isSplit: false,
    },
    {
      order: 2,
      title: 'В чому користь мухоморів? ?',
      titleEn: 'What are the benefits of fly agarics?',
      body: [
        'Мухомори традиційно використовувалися в різних культурах у вигляді висушеної сировини. Їм приписують вплив на релаксацію, покращення настрою, загальне самопочуття.',
        '⚠️ Водночас важливо розуміти, що реакція організму індивідуальна. Перед вживанням будь-яких продуктів рослинного походження рекомендується ознайомитись з інформацією та дотримуватись обережності.',
      ].join('\n\n'),
      bodyEn: [
        'Fly agarics have traditionally been used in various cultures as dried raw material. They are credited with effects on relaxation, mood improvement, and overall wellbeing.',
        '⚠️ At the same time it is important to understand that individual body response may vary. Before use of any plant-based products it is recommended to review the information and follow precautions.',
      ].join('\n\n'),
      isSplit: true,
    },
    {
      order: 3,
      title: 'Чи є у нас джойнти ?',
      titleEn: 'Do you sell joints?',
      body: [
        'Ні. Ми не продаємо джойнти або будь-яку продукцію сумнівного походження.',
        'Також ми не маємо відношення до інших магазинів чи сторонніх продавців.',
        'Ми працюємо виключно з перевіреною продукцією та дотримуємося чинного законодавства',
      ].join('\n\n'),
      bodyEn: [
        'No. We do not sell joints or any products of dubious origin.',
        'We are also not affiliated with other stores or third-party sellers.',
        'We work exclusively with verified products and comply with current legislation',
      ].join('\n\n'),
      isSplit: true,
    },
  ];

  async listFaqItems(activeOnly = false) {
    const count = await this.prisma.faqItem.count();
    if (count === 0) {
      await this.prisma.faqItem.createMany({
        data: this.defaultFaqItems.map((item) => ({
          ...item,
          isActive: true,
        })),
      });
    } else {
      // Доповнюємо EN для старих записів без перекладу
      for (const def of this.defaultFaqItems) {
        if (!def.titleEn && !def.bodyEn) continue;
        await this.prisma.faqItem.updateMany({
          where: {
            title: def.title,
            OR: [{ titleEn: null }, { bodyEn: null }],
          },
          data: {
            ...(def.titleEn ? { titleEn: def.titleEn } : {}),
            ...(def.bodyEn ? { bodyEn: def.bodyEn } : {}),
          },
        });
      }
    }
    return this.prisma.faqItem.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { order: 'asc' },
    });
  }

  async createFaqItem(dto: UpsertFaqItemDto) {
    const count = await this.prisma.faqItem.count();
    return this.prisma.faqItem.create({
      data: {
        title: dto.title,
        titleEn: dto.titleEn ?? null,
        body: dto.body ?? '',
        bodyEn: dto.bodyEn ?? null,
        order: dto.order ?? count,
        isActive: dto.isActive ?? true,
        isSplit: dto.isSplit ?? false,
      },
    });
  }

  async updateFaqItem(id: string, dto: Partial<UpsertFaqItemDto>) {
    const existing = await this.prisma.faqItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('FAQ item not found');
    return this.prisma.faqItem.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.titleEn !== undefined ? { titleEn: dto.titleEn } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.bodyEn !== undefined ? { bodyEn: dto.bodyEn } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.isSplit !== undefined ? { isSplit: dto.isSplit } : {}),
      },
    });
  }

  async deleteFaqItem(id: string) {
    await this.prisma.faqItem.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('FAQ item not found');
    });
    return { ok: true };
  }

  // ─── Content: Contacts ───

  async getContactSettings() {
    return this.prisma.contactSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        introTitle: "Ми завжди на зв'язку",
        introText:
          'підкажемо, допоможемо з вибором і зорієнтуємо в асортименті.\nТакож будемо раді бачити вас у нашому просторі за чашкою кави та в атмосфері спокою.',
        scheduleTitle: 'Графік роботи',
        hoursTime: '12:00 - 21:00',
        daysOff: 'Без вихідних',
        holidayNote: 'В святкові дні години роботи можуть змінюватися',
        address: 'м. Дніпро, Проспект Дмитра Яворницького 57',
        email: 'secretgardendp57@gmail.com',
        instagramUrl: 'https://www.instagram.com/secret_garden_dnipro',
        instagramLabel: 'secret_garden_dnipro',
        telegramUrls: [
          'https://t.me/secret_Garden_shop420',
          'https://t.me/secret_garden_manager',
        ],
        telegramLabels: ['secret_Garden_shop420', 'secret_garden_manager'],
        mapLat: 48.463662,
        mapLng: 35.046347,
        mapZoom: 17,
        venuePhotoUrl: '/фото.png',
      },
      update: {},
    });
  }

  async updateContactSettings(dto: UpdateContactSettingsDto) {
    await this.getContactSettings();
    return this.prisma.contactSettings.update({
      where: { id: 'default' },
      data: {
        ...(dto.introTitle !== undefined ? { introTitle: dto.introTitle } : {}),
        ...(dto.introText !== undefined ? { introText: dto.introText } : {}),
        ...(dto.scheduleTitle !== undefined
          ? { scheduleTitle: dto.scheduleTitle }
          : {}),
        ...(dto.hoursTime !== undefined ? { hoursTime: dto.hoursTime } : {}),
        ...(dto.daysOff !== undefined ? { daysOff: dto.daysOff } : {}),
        ...(dto.holidayNote !== undefined
          ? { holidayNote: dto.holidayNote }
          : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.instagramUrl !== undefined
          ? { instagramUrl: dto.instagramUrl }
          : {}),
        ...(dto.instagramLabel !== undefined
          ? { instagramLabel: dto.instagramLabel }
          : {}),
        ...(dto.telegramUrls !== undefined
          ? { telegramUrls: dto.telegramUrls as Prisma.InputJsonValue }
          : {}),
        ...(dto.telegramLabels !== undefined
          ? { telegramLabels: dto.telegramLabels as Prisma.InputJsonValue }
          : {}),
        ...(dto.mapLat !== undefined ? { mapLat: dto.mapLat } : {}),
        ...(dto.mapLng !== undefined ? { mapLng: dto.mapLng } : {}),
        ...(dto.mapZoom !== undefined ? { mapZoom: dto.mapZoom } : {}),
        ...(dto.mapEmbedUrl !== undefined
          ? { mapEmbedUrl: dto.mapEmbedUrl }
          : {}),
        ...(dto.venuePhotoUrl !== undefined
          ? { venuePhotoUrl: dto.venuePhotoUrl }
          : {}),
        ...(dto.certificateUrl !== undefined
          ? { certificateUrl: dto.certificateUrl }
          : {}),
        ...(dto.donationUrl !== undefined
          ? { donationUrl: dto.donationUrl }
          : {}),
      },
    });
  }

  buildMapEmbedUrl(
    settings: {
      mapEmbedUrl?: string | null;
      mapLat: number;
      mapLng: number;
      mapZoom: number;
    },
    locale: 'uk' | 'en' = 'uk',
  ) {
    const hl = locale === 'en' ? 'en' : 'uk';
    if (settings.mapEmbedUrl?.trim()) {
      try {
        const url = new URL(settings.mapEmbedUrl.trim());
        url.searchParams.set('hl', hl);
        return url.toString();
      } catch {
        return settings.mapEmbedUrl.trim();
      }
    }
    return `https://www.google.com/maps?q=${settings.mapLat},${settings.mapLng}&z=${settings.mapZoom}&hl=${hl}&output=embed`;
  }

  async getPublicContent(locale: AppLocale = 'uk') {
    const [banners, aboutBlocks, contacts, faqItems] = await Promise.all([
      this.listBanners(true),
      this.listAboutBlocks(),
      this.getContactSettings(),
      this.listFaqItems(true),
    ]);
    return {
      banners: banners.map((b) =>
        localizeBannerRecord(b as Record<string, unknown>, locale),
      ),
      aboutBlocks: aboutBlocks.map((b) =>
        localizeAboutRecord(b as Record<string, unknown>, locale),
      ),
      contacts: {
        ...localizeContactsRecord(
          contacts as Record<string, unknown>,
          locale,
        ),
        mapSrc: this.buildMapEmbedUrl(contacts, locale),
      },
      faqItems: faqItems.map((b) =>
        localizeFaqRecord(b as Record<string, unknown>, locale),
      ),
    };
  }
}
