import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { resolveRequestLocale } from '../common/i18n/localized-fields';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  private locale(
    acceptLanguage?: string,
    queryLang?: string,
  ) {
    return resolveRequestLocale(acceptLanguage, queryLang);
  }

  private parseAgeVerified(header?: string): boolean | null {
    if (header === 'true') return true;
    if (header === 'false') return false;
    return null;
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get catalog categories tree' })
  getCategories(
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    return this.catalogService.getCategories(
      this.locale(acceptLanguage, lang),
    );
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Get all product reviews (for homepage etc.)' })
  getAllReviews(
    @Query('limit') limit?: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    const parsed = limit ? parseInt(limit, 10) : 50;
    return this.catalogService.getAllReviews(
      Number.isFinite(parsed) ? parsed : 50,
      this.locale(acceptLanguage, lang),
    );
  }

  @Get('products')
  @ApiOperation({ summary: 'Get products list with filters' })
  getProducts(
    @Query() query: ProductQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') queryLang?: string,
    @Headers('x-age-verified') ageVerifiedHeader?: string,
  ) {
    return this.catalogService.getProducts(
      query,
      this.locale(acceptLanguage, queryLang),
      this.parseAgeVerified(ageVerifiedHeader),
    );
  }

  @Get('products/:slugOrId')
  @ApiOperation({ summary: 'Get product details by slug or id' })
  getProduct(
    @Param('slugOrId') slugOrId: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
    @Headers('x-age-verified') ageVerifiedHeader?: string,
  ) {
    return this.catalogService.getProductBySlugOrId(
      slugOrId,
      this.locale(acceptLanguage, lang),
      this.parseAgeVerified(ageVerifiedHeader),
    );
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
