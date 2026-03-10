import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CartItemDto {
  /** ID товару — string (WooCommerce "123" або CUID "clx...") */
  @IsOptional()
  @Transform(({ value }) => (value != null ? String(value).trim() : undefined))
  @IsString()
  productId?: string;

  /** fallback: slug товару, якщо productId немає */
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number = 1;
}

export class CartSyncDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}
