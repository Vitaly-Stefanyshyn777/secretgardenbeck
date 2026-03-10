import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WishlistService } from './wishlist.service';
import { WishlistSyncDto } from './dto/wishlist-sync.dto';

@ApiTags('wishlist')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user wishlist' })
  getWishlist(@Req() req: any) {
    return this.wishlistService.getWishlist(req.user.id);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Batch sync wishlist (replace entire list)' })
  syncWishlist(@Req() req: any, @Body() data: WishlistSyncDto) {
    return this.wishlistService.syncWishlist(req.user.id, data.productIds);
  }
}
