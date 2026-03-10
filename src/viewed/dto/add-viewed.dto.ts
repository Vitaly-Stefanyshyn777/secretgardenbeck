import { IsString } from 'class-validator';

export class AddViewedDto {
  @IsString()
  productId: string;
}
