import { IsArray, IsString } from 'class-validator';

export class SyncViewedDto {
  @IsArray()
  @IsString({ each: true })
  productIds: string[];
}
