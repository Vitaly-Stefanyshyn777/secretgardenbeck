import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Створити замовлення' })
  create(@Req() req: any, @Body() data: CreateOrderDto) {
    return this.ordersService.create(req.user.id, data);
  }

  @Get()
  @ApiOperation({ summary: 'Список замовлень користувача' })
  findMyOrders(@Req() req: any) {
    return this.ordersService.findByUser(req.user.id);
  }
}
