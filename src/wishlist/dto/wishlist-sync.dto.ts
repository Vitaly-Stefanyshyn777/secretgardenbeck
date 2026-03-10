import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class WishlistItemDto {
  /** ID товару — string (cuid або WooCommerce id як рядок) */
  @IsOptional()
  @Transform(({ value }) => (value != null ? String(value).trim() : undefined))
  @IsString()
  productId?: string;

  /** fallback: slug товару, якщо productId немає */
  @IsOptional()
  @IsString()
  slug?: string;
}

export class WishlistSyncDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WishlistItemDto)
  items?: WishlistItemDto[];

  /** застаріло: використовувати items */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];
}
