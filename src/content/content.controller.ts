import { Controller, Get, Headers, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from '../admin/admin.service';
import { resolveRequestLocale, localizeBannerRecord } from '../common/i18n/localized-fields';

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
  listAbout() {
    return this.adminService.listAboutBlocks();
  }

  @Get('contacts')
  async getContacts() {
    const contacts = await this.adminService.getContactSettings();
    return {
      ...contacts,
      mapSrc: this.adminService.buildMapEmbedUrl(contacts),
    };
  }

  @Get('venue-photos')
  listVenuePhotos() {
    return this.adminService.listVenuePhotos(true);
  }

  @Get('faq')
  listFaq() {
    return this.adminService.listFaqItems(true);
  }
}
