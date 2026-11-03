-- CreateEnum
CREATE TYPE "MarketplaceStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'SOLD', 'UNAVAILABLE', 'REMOVED');

-- CreateEnum
CREATE TYPE "MarketplaceCondition" AS ENUM ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR');

-- CreateTable
CREATE TABLE "MarketplaceItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priceCents" INTEGER,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "condition" "MarketplaceCondition" NOT NULL DEFAULT 'GOOD',
    "locationLabel" TEXT NOT NULL,
    "regionKey" TEXT NOT NULL,
    "imageUrl" TEXT,
    "galleryUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "MarketplaceStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceFavorite" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceItem_status_regionKey_createdAt_idx" ON "MarketplaceItem"("status", "regionKey", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceItem_status_category_regionKey_createdAt_idx" ON "MarketplaceItem"("status", "category", "regionKey", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceItem_createdById_createdAt_idx" ON "MarketplaceItem"("createdById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceFavorite_itemId_userId_key" ON "MarketplaceFavorite"("itemId", "userId");

-- CreateIndex
CREATE INDEX "MarketplaceFavorite_userId_createdAt_idx" ON "MarketplaceFavorite"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "MarketplaceItem" ADD CONSTRAINT "MarketplaceItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceFavorite" ADD CONSTRAINT "MarketplaceFavorite_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MarketplaceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceFavorite" ADD CONSTRAINT "MarketplaceFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;