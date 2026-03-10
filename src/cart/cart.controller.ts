import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CartService } from './cart.service';
import { CartSyncDto } from './dto/cart-sync.dto';

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  getCart(@Req() req: any) {
    return this.cartService.getCart(req.user.id);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Batch sync cart (replace entire cart)' })
  syncCart(@Req() req: any, @Body() data: CartSyncDto) {
    const items = Array.isArray(data?.items) ? data.items : [];
    return this.cartService.syncCart(
      req.user.id,
      items.map((i) => ({
        productId: i.productId ?? (i as any).product_id ?? '',
        quantity: i.quantity ?? 1,
      })),
    );
  }
}
