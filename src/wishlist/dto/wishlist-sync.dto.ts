import { IsArray, IsString } from 'class-validator';

export class WishlistSyncDto {
  @IsArray()
  @IsString({ each: true })
  productIds: string[];
}
