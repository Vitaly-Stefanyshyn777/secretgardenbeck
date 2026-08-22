import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { LoginInput } from '../auth/dto/login.input';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import {
  CreateAdminCategoryDto,
  CreateAdminProductDto,
  CreateAdminPromoCodeDto,
  UpdateAdminCategoryDto,
  UpdateAdminOrderStatusDto,
  UpdateAdminProductDto,
  UpdateAdminPromoCodeDto,
  UpdateAdminUserRoleDto,
  UpdateContactSettingsDto,
  UploadImageDto,
  UpsertAboutBlockDto,
  UpsertBannerDto,
  UpsertVenuePhotoDto,
} from './dto/admin.dto';
import { PromoCodesService } from '../promo-codes/promo-codes.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly promoCodes: PromoCodesService,
  ) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login (ADMIN role only)' })
  login(@Body() body: LoginInput) {
    return this.adminService.login(body.email, body.password);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  me(@Req() req: any) {
    return this.adminService.me(req.user);
  }

  @Post('upload')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Upload product image (data URI → Cloudinary)' })
  upload(@Body() body: UploadImageDto) {
    return this.adminService.uploadImage(body.dataUri);
  }

  // Products
  @Get('products')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  listProducts() {
    return this.adminService.listProducts();
  }

  @Get('products/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  getProduct(@Param('id') id: string) {
    return this.adminService.getProduct(id);
  }

  @Post('products')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  createProduct(@Body() dto: CreateAdminProductDto) {
    return this.adminService.createProduct(dto);
  }

  @Patch('products/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  updateProduct(@Param('id') id: string, @Body() dto: UpdateAdminProductDto) {
    return this.adminService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(id);
  }

  // Categories
  @Get('categories')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  listCategories() {
    return this.adminService.listCategories();
  }

  @Get('categories/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  getCategory(@Param('id') id: string) {
    return this.adminService.getCategory(id);
  }

  @Post('categories')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  createCategory(@Body() dto: CreateAdminCategoryDto) {
    return this.adminService.createCategory(dto);
  }

  @Patch('categories/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateAdminCategoryDto,
  ) {
    return this.adminService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }

  // Orders
  @Get('orders')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  listOrders() {
    return this.adminService.listOrders();
  }

  @Get('orders/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  getOrder(@Param('id') id: string) {
    return this.adminService.getOrder(id);
  }

  @Patch('orders/:id/status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAdminOrderStatusDto,
  ) {
    return this.adminService.updateOrderStatus(id, dto);
  }

  // Users
  @Get('users')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get('users/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/role')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserRoleDto,
  ) {
    return this.adminService.updateUserRole(id, dto);
  }

  // Banners
  @Get('banners')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  listBanners() {
    return this.adminService.listBanners();
  }

  @Post('banners')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  createBanner(@Body() dto: UpsertBannerDto) {
    return this.adminService.createBanner(dto);
  }

  @Patch('banners/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  updateBanner(@Param('id') id: string, @Body() dto: UpsertBannerDto) {
    return this.adminService.updateBanner(id, dto);
  }

  @Delete('banners/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  deleteBanner(@Param('id') id: string) {
    return this.adminService.deleteBanner(id);
  }

  // About
  @Get('about-blocks')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  listAboutBlocks() {
    return this.adminService.listAboutBlocks();
  }

  @Post('about-blocks')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  createAboutBlock(@Body() dto: UpsertAboutBlockDto) {
    return this.adminService.createAboutBlock(dto);
  }

  @Patch('about-blocks/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  updateAboutBlock(@Param('id') id: string, @Body() dto: UpsertAboutBlockDto) {
    return this.adminService.updateAboutBlock(id, dto);
  }

  @Delete('about-blocks/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  deleteAboutBlock(@Param('id') id: string) {
    return this.adminService.deleteAboutBlock(id);
  }

  // Contacts
  @Get('contacts')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  getContacts() {
    return this.adminService.getContactSettings();
  }

  @Patch('contacts')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  updateContacts(@Body() dto: UpdateContactSettingsDto) {
    return this.adminService.updateContactSettings(dto);
  }

  // Venue photos
  @Get('venue-photos')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  listVenuePhotos() {
    return this.adminService.listVenuePhotos();
  }

  @Post('venue-photos')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  createVenuePhoto(@Body() dto: UpsertVenuePhotoDto) {
    return this.adminService.createVenuePhoto(dto);
  }

  @Patch('venue-photos/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  updateVenuePhoto(@Param('id') id: string, @Body() dto: UpsertVenuePhotoDto) {
    return this.adminService.updateVenuePhoto(id, dto);
  }

  @Delete('venue-photos/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  deleteVenuePhoto(@Param('id') id: string) {
    return this.adminService.deleteVenuePhoto(id);
  }

  @Get('promo-codes')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  listPromoCodes() {
    return this.promoCodes.list();
  }

  @Post('promo-codes')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  createPromoCode(@Body() dto: CreateAdminPromoCodeDto) {
    return this.promoCodes.create(dto);
  }

  @Patch('promo-codes/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  updatePromoCode(
    @Param('id') id: string,
    @Body() dto: UpdateAdminPromoCodeDto,
  ) {
    return this.promoCodes.update(id, dto);
  }

  @Delete('promo-codes/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  deletePromoCode(@Param('id') id: string) {
    return this.promoCodes.remove(id);
  }
}
