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
  UpsertVenuePhotoDto,
} from './dto/admin.dto';

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
    const tokens = await this.authService.login(email.toLowerCase(), password);
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
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return {
      ...this.withDefaultImage(product),
      ...this.mapProductCategories(product),
    };
  }

  async createProduct(dto: CreateAdminProductDto) {
    const images = this.normalizeImageFields(dto);
    const categoryIds = this.resolveCategoryLinkIds(
      dto.categoryId,
      dto.subcategoryId,
    );

    return this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        price: new Prisma.Decimal(dto.price),
        salePrice:
          dto.salePrice === undefined || dto.salePrice === null
            ? null
            : new Prisma.Decimal(dto.salePrice),
        currency: dto.currency ?? 'UAH',
        shortDescription: dto.shortDescription,
        description: dto.description,
        inStock: dto.inStock ?? true,
        stockQuantity: dto.stockQuantity ?? null,
        mainImageUrl: images.mainImageUrl,
        imageUrls: images.imageUrls,
        label: dto.label,
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
    await this.getProduct(id);

    const data: Prisma.ProductUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
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
        ? { shortDescription: dto.shortDescription }
        : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.inStock !== undefined ? { inStock: dto.inStock } : {}),
      ...(dto.stockQuantity !== undefined
        ? { stockQuantity: dto.stockQuantity }
        : {}),
      ...(dto.label !== undefined ? { label: dto.label } : {}),
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
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } },
        parent: true,
        children: { orderBy: { name: 'asc' } },
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
    return this.prisma.category.create({
      data: {
        name: dto.name,
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
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
      },
    });
  }

  async deleteCategory(id: string) {
    await this.getCategory(id);
    await this.prisma.category.delete({ where: { id } });
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
        titleSub: dto.titleSub ?? null,
        description: dto.description ?? '',
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
        ...(dto.titleSub !== undefined ? { titleSub: dto.titleSub } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
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
        body: dto.body ?? '',
        imageUrl: dto.imageUrl ?? null,
        imageLeft: dto.imageLeft ?? true,
        ctaLabel: dto.ctaLabel ?? null,
        ctaUrl: dto.ctaUrl ?? null,
        links: (dto.links ?? []) as Prisma.InputJsonValue,
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
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.imageLeft !== undefined ? { imageLeft: dto.imageLeft } : {}),
        ...(dto.ctaLabel !== undefined ? { ctaLabel: dto.ctaLabel } : {}),
        ...(dto.ctaUrl !== undefined ? { ctaUrl: dto.ctaUrl } : {}),
        ...(dto.links !== undefined
          ? { links: dto.links as Prisma.InputJsonValue }
          : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
      },
    });
  }

  async deleteAboutBlock(id: string) {
    await this.prisma.aboutBlock.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('About block not found');
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
        mapLat: 48.4647,
        mapLng: 35.0462,
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

  buildMapEmbedUrl(settings: {
    mapEmbedUrl?: string | null;
    mapLat: number;
    mapLng: number;
    mapZoom: number;
  }) {
    if (settings.mapEmbedUrl?.trim()) return settings.mapEmbedUrl.trim();
    return `https://www.google.com/maps?q=${settings.mapLat},${settings.mapLng}&z=${settings.mapZoom}&output=embed`;
  }

  // ─── Content: Venue photos ───

  async listVenuePhotos(activeOnly = false) {
    return this.prisma.venuePhoto.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { order: 'asc' },
    });
  }

  async createVenuePhoto(dto: UpsertVenuePhotoDto) {
    const count = await this.prisma.venuePhoto.count();
    return this.prisma.venuePhoto.create({
      data: {
        imageUrl: dto.imageUrl,
        title: dto.title ?? null,
        alt: dto.alt ?? null,
        order: dto.order ?? count,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateVenuePhoto(id: string, dto: Partial<UpsertVenuePhotoDto>) {
    const existing = await this.prisma.venuePhoto.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Venue photo not found');
    return this.prisma.venuePhoto.update({
      where: { id },
      data: {
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.alt !== undefined ? { alt: dto.alt } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteVenuePhoto(id: string) {
    await this.prisma.venuePhoto.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Venue photo not found');
    });
    return { ok: true };
  }

  async getPublicContent() {
    const [banners, aboutBlocks, contacts, venuePhotos] = await Promise.all([
      this.listBanners(true),
      this.listAboutBlocks(),
      this.getContactSettings(),
      this.listVenuePhotos(true),
    ]);
    return {
      banners,
      aboutBlocks,
      contacts: {
        ...contacts,
        mapSrc: this.buildMapEmbedUrl(contacts),
      },
      venuePhotos,
    };
  }
}
