import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class AdminCharacteristicDto {
  @IsString()
  name: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class AdminDescriptionBlockDto {
  @IsIn(['paragraph', 'list', 'heading'])
  type: 'paragraph' | 'list' | 'heading';

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  items?: string[];

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class CreateAdminProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  nameEn?: string | null;

  @IsOptional()
  @IsString()
  nameUk?: string | null;

  @IsString()
  slug: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number | null;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  shortDescriptionEn?: string | null;

  @IsOptional()
  @IsString()
  shortDescriptionUk?: string | null;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string | null;

  @IsOptional()
  @IsString()
  descriptionUk?: string | null;

  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @IsNumber()
  stockQuantity?: number | null;

  @IsOptional()
  @IsString()
  mainImageUrl?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  labelEn?: string | null;

  @IsOptional()
  @IsString()
  labelUk?: string | null;

  /** Батьківська категорія (напр. «Гриби») */
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  /** Підкатегорія (напр. «Мікродозинг») */
  @IsOptional()
  @IsString()
  subcategoryId?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminCharacteristicDto)
  characteristics?: AdminCharacteristicDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminDescriptionBlockDto)
  descriptionBlocks?: AdminDescriptionBlockDto[];

  /** Значення фільтрів категорії (тип, виробник, матеріал…) */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filterValueIds?: string[];

  @IsOptional()
  @IsBoolean()
  ageRestricted?: boolean;
}

export class UpdateAdminProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  nameEn?: string | null;

  @IsOptional()
  @IsString()
  nameUk?: string | null;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number | null;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  shortDescriptionEn?: string | null;

  @IsOptional()
  @IsString()
  shortDescriptionUk?: string | null;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string | null;

  @IsOptional()
  @IsString()
  descriptionUk?: string | null;

  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @IsNumber()
  stockQuantity?: number | null;

  @IsOptional()
  @IsString()
  mainImageUrl?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  labelEn?: string | null;

  @IsOptional()
  @IsString()
  labelUk?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  subcategoryId?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminCharacteristicDto)
  characteristics?: AdminCharacteristicDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminDescriptionBlockDto)
  descriptionBlocks?: AdminDescriptionBlockDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filterValueIds?: string[];

  @IsOptional()
  @IsBoolean()
  ageRestricted?: boolean;
}

export class UploadImageDto {
  @IsString()
  dataUri: string;
}

export class UploadPdfDto {
  @IsString()
  dataUri: string;
}

export class CreateAdminCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  nameEn?: string | null;

  @IsOptional()
  @IsString()
  nameUk?: string | null;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}

export class UpdateAdminCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  nameEn?: string | null;

  @IsOptional()
  @IsString()
  nameUk?: string | null;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}

export class UpdateAdminOrderStatusDto {
  @IsString()
  status: string;
}

export class UpdateAdminUserRoleDto {
  @IsString()
  role: 'ADMIN' | 'USER';
}

export class UpsertBannerDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  titleEn?: string | null;

  @IsOptional()
  @IsString()
  titleSub?: string | null;

  @IsOptional()
  @IsString()
  titleSubEn?: string | null;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string | null;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  mobileImageUrl?: string | null;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertAboutBlockDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  titleEn?: string | null;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  bodyEn?: string | null;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  imageLeft?: boolean;

  @IsOptional()
  @IsBoolean()
  buttonsLeft?: boolean;

  @IsOptional()
  @IsString()
  ctaLabel?: string | null;

  @IsOptional()
  @IsString()
  ctaLabelEn?: string | null;

  @IsOptional()
  @IsString()
  ctaUrl?: string | null;

  @IsOptional()
  links?: Array<{ label: string; url: string; kind?: string }>;

  @IsOptional()
  @IsNumber()
  textPadding?: number;

  @IsOptional()
  textBlocks?: Array<{ text: string; gap?: number }>;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class UpsertFaqItemDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  titleEn?: string | null;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  bodyEn?: string | null;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isSplit?: boolean;
}

export class UpdateContactSettingsDto {
  @IsOptional()
  @IsString()
  introTitle?: string;

  @IsOptional()
  @IsString()
  introText?: string;

  @IsOptional()
  @IsString()
  scheduleTitle?: string;

  @IsOptional()
  @IsString()
  hoursTime?: string;

  @IsOptional()
  @IsString()
  daysOff?: string;

  @IsOptional()
  @IsString()
  holidayNote?: string | null;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  instagramLabel?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  telegramUrls?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  telegramLabels?: string[];

  @IsOptional()
  @IsNumber()
  mapLat?: number;

  @IsOptional()
  @IsNumber()
  mapLng?: number;

  @IsOptional()
  @IsNumber()
  mapZoom?: number;

  @IsOptional()
  @IsString()
  mapEmbedUrl?: string | null;

  @IsOptional()
  @IsString()
  venuePhotoUrl?: string | null;

  @IsOptional()
  @IsString()
  certificateUrl?: string | null;

  @IsOptional()
  @IsString()
  donationUrl?: string | null;
}

export class CreateAdminPromoCodeDto {
  @IsString()
  code: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  discountPercent: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number | null;
}

export class UpdateAdminPromoCodeDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number | null;
}
