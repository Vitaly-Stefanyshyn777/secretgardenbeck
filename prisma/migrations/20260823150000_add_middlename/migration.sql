-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "middlename" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "middleName" TEXT;
