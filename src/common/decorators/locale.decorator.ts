import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { resolveRequestLocale } from '../i18n/localized-fields';

export const RequestLocale = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const header = req.headers['accept-language'] as string | undefined;
    const queryLang = req.query?.lang as string | undefined;
    return resolveRequestLocale(header, queryLang);
  },
);
