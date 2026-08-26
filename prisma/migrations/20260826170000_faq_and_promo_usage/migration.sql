-- FAQ items
CREATE TABLE IF NOT EXISTS "FaqItem" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL DEFAULT '',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isSplit" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- Promo: once per user
CREATE TABLE IF NOT EXISTS "PromoCodeUsage" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "promoCodeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT,
  CONSTRAINT "PromoCodeUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PromoCodeUsage_promoCodeId_userId_key"
  ON "PromoCodeUsage"("promoCodeId", "userId");

CREATE INDEX IF NOT EXISTS "PromoCodeUsage_userId_idx"
  ON "PromoCodeUsage"("userId");

DO $$ BEGIN
  ALTER TABLE "PromoCodeUsage"
    ADD CONSTRAINT "PromoCodeUsage_promoCodeId_fkey"
    FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PromoCodeUsage"
    ADD CONSTRAINT "PromoCodeUsage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
