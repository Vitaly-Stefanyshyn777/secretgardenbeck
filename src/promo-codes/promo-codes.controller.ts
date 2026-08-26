import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { AuthService } from '../auth/auth.service';
import { PromoCodesService } from './promo-codes.service';

class ValidatePromoCodeDto {
  @IsString()
  code: string;
}

@ApiTags('promo-codes')
@Controller('promo-codes')
export class PromoCodesController {
  constructor(
    private readonly promoCodes: PromoCodesService,
    private readonly auth: AuthService,
  ) {}

  @Post('validate')
  async validate(@Req() req: any, @Body() body: ValidatePromoCodeDto) {
    let userId: string | undefined;
    const header = String(req.headers?.authorization || '');
    const token = header.startsWith('Bearer ')
      ? header.slice(7).trim()
      : '';
    if (token) {
      try {
        const user = await this.auth.getUserFromToken(token);
        userId = user?.id;
      } catch {
        // validate без auth — лише глобальні правила
      }
    }
    return this.promoCodes.validate(body?.code, userId);
  }
}
