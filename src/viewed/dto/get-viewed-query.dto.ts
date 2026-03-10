import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetViewedQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;
}
