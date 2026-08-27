import { Controller, Get, Headers, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from '../admin/admin.service';
import {
  resolveRequestLocale,
  localizeBannerRecord,
  localizeFaqRecord,
  localizeAboutRecord,
  localizeContactsRecord,
} from '../common/i18n/localized-fields';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Public site content (banners, about, contacts)' })
  getAll(
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    const locale = resolveRequestLocale(acceptLanguage, lang);
    return this.adminService.getPublicContent(locale);
  }

  @Get('banners')
  listBanners(
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    const locale = resolveRequestLocale(acceptLanguage, lang);
    return this.adminService.listBanners(true).then((rows) =>
      rows.map((b) => localizeBannerRecord(b as Record<string, unknown>, locale)),
    );
  }

  @Get('about')
  listAbout(
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    const locale = resolveRequestLocale(acceptLanguage, lang);
    return this.adminService.listAboutBlocks().then((rows) =>
      rows.map((b) => localizeAboutRecord(b as Record<string, unknown>, locale)),
    );
  }

  @Get('contacts')
  async getContacts(
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    const locale = resolveRequestLocale(acceptLanguage, lang);
    const contacts = await this.adminService.getContactSettings();
    const localized = localizeContactsRecord(
      contacts as Record<string, unknown>,
      locale,
    );
    return {
      ...localized,
      mapSrc: this.adminService.buildMapEmbedUrl(contacts, locale),
    };
  }

  @Get('faq')
  listFaq(
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    const locale = resolveRequestLocale(acceptLanguage, lang);
    return this.adminService.listFaqItems(true).then((rows) =>
      rows.map((b) => localizeFaqRecord(b as Record<string, unknown>, locale)),
    );
  }
}
