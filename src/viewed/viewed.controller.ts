import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ViewedService } from './viewed.service';
import { AddViewedDto } from './dto/add-viewed.dto';
import { SyncViewedDto } from './dto/sync-viewed.dto';
import { GetViewedQueryDto } from './dto/get-viewed-query.dto';

@ApiTags('viewed')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('viewed')
export class ViewedController {
  constructor(private readonly viewedService: ViewedService) {}

  @Post()
  @ApiOperation({ summary: 'Add product to viewed history' })
  addViewed(@Req() req: any, @Body() data: AddViewedDto) {
    return this.viewedService.addViewed(req.user.id, data.productId);
  }

  @Get()
  @ApiOperation({ summary: 'Get viewed products list' })
  getViewed(@Req() req: any, @Query() query: GetViewedQueryDto) {
    const take = query.limit ?? 12;
    return this.viewedService.getViewed(req.user.id, take);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync local viewed IDs to server' })
  syncViewed(@Req() req: any, @Body() data: SyncViewedDto) {
    return this.viewedService.syncViewed(req.user.id, data.productIds);
  }
}
