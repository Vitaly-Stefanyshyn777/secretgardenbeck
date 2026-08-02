import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from '../admin/admin.service';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Public site content (banners, about, contacts)' })
  getAll() {
    return this.adminService.getPublicContent();
  }

  @Get('banners')
  listBanners() {
    return this.adminService.listBanners(true);
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
}
