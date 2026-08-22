import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PromoCodesService } from './promo-codes.service';

class ValidatePromoCodeDto {
  @IsString()
  code: string;
}

@ApiTags('promo-codes')
@Controller('promo-codes')
export class PromoCodesController {
  constructor(private readonly promoCodes: PromoCodesService) {}

  @Post('validate')
  validate(@Body() body: ValidatePromoCodeDto) {
    return this.promoCodes.validate(body?.code);
  }
}
