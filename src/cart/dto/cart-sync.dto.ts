import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CartItemDto {
  @Transform(({ obj }) => obj.productId ?? obj.product_id)
  @IsString()
  productId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;
}

export class CartSyncDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}
