-- Add i18n columns for products and categories
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "nameUk" TEXT;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "nameUk" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "shortDescriptionEn" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "shortDescriptionUk" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "descriptionEn" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "descriptionUk" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "labelEn" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "labelUk" TEXT;

-- Backfill Ukrainian locale from existing base fields
UPDATE "Category" SET "nameUk" = "name" WHERE "nameUk" IS NULL;
UPDATE "Product" SET "nameUk" = "name" WHERE "nameUk" IS NULL;
UPDATE "Product" SET "shortDescriptionUk" = "shortDescription" WHERE "shortDescriptionUk" IS NULL AND "shortDescription" IS NOT NULL;
UPDATE "Product" SET "descriptionUk" = "description" WHERE "descriptionUk" IS NULL AND "description" IS NOT NULL;
UPDATE "Product" SET "labelUk" = "label" WHERE "labelUk" IS NULL AND "label" IS NOT NULL;
