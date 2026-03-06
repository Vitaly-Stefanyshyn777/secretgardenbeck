import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Get catalog categories tree' })
  getCategories() {
    return this.catalogService.getCategories();
  }

  @Get('products')
  @ApiOperation({ summary: 'Get products list with filters' })
  getProducts(@Query() query: ProductQueryDto) {
    return this.catalogService.getProducts(query);
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'Get product details by slug' })
  getProduct(@Param('slug') slug: string) {
    return this.catalogService.getProductBySlug(slug);
  }

  @Get('products/:slug/reviews')
  @ApiOperation({ summary: 'Get product reviews' })
  getReviews(@Param('slug') slug: string) {
    return this.catalogService.getReviews(slug);
  }

  @Post('products/:slug/reviews')
  @ApiOperation({ summary: 'Create product review' })
  addReview(
    @Param('slug') slug: string,
    @Body() data: CreateReviewDto,
  ) {
    return this.catalogService.addReview(slug, data);
  }
}

