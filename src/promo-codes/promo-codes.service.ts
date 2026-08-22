import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateAdminPromoCodeDto,
  UpdateAdminPromoCodeDto,
} from '../admin/dto/admin.dto';

@Injectable()
export class PromoCodesService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeCode(code: string) {
    return String(code || '')
      .trim()
      .toUpperCase();
  }

  list() {
    return this.prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  private parseExpiresAt(value?: string | null) {
    if (value === undefined) return undefined;
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Некоректна дата закінчення');
    }
    return d;
  }

  async create(dto: CreateAdminPromoCodeDto) {
    const code = this.normalizeCode(dto.code);
    if (!code) throw new BadRequestException('Вкажи код промокоду');

    try {
      return await this.prisma.promoCode.create({
        data: {
          code,
          discountPercent: Math.round(dto.discountPercent),
          isActive: dto.isActive ?? true,
          expiresAt: this.parseExpiresAt(dto.expiresAt) ?? null,
          usageLimit: dto.usageLimit ?? null,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException('Такий промокод уже існує');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateAdminPromoCodeDto) {
    const existing = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Промокод не знайдено');

    const data: Prisma.PromoCodeUpdateInput = {};
    if (dto.code !== undefined) {
      const code = this.normalizeCode(dto.code);
      if (!code) throw new BadRequestException('Вкажи код промокоду');
      data.code = code;
    }
    if (dto.discountPercent !== undefined) {
      data.discountPercent = Math.round(dto.discountPercent);
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.expiresAt !== undefined) {
      data.expiresAt = this.parseExpiresAt(dto.expiresAt);
    }
    if (dto.usageLimit !== undefined) data.usageLimit = dto.usageLimit;

    try {
      return await this.prisma.promoCode.update({ where: { id }, data });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException('Такий промокод уже існує');
      }
      throw e;
    }
  }

  async remove(id: string) {
    await this.prisma.promoCode.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Промокод не знайдено');
    });
    return { ok: true };
  }

  async assertValid(rawCode: string) {
    const code = this.normalizeCode(rawCode);
    if (!code) throw new BadRequestException('Вкажи промокод');

    const promo = await this.prisma.promoCode.findUnique({ where: { code } });
    if (!promo || !promo.isActive) {
      throw new BadRequestException('Промокод недійсний');
    }
    if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Термін дії промокоду закінчився');
    }
    if (
      promo.usageLimit != null &&
      promo.usageCount >= promo.usageLimit
    ) {
      throw new BadRequestException('Промокод уже використано');
    }
    return promo;
  }

  async validate(rawCode: string) {
    const promo = await this.assertValid(rawCode);
    return {
      code: promo.code,
      discountPercent: promo.discountPercent,
    };
  }
}
