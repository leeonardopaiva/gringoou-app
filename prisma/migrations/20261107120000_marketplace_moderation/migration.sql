-- AlterEnum
ALTER TYPE "MarketplaceStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "MarketplaceItem" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedById" TEXT,
ADD COLUMN     "moderationReason" TEXT;

-- CreateTable
CREATE TABLE "MarketplaceModerationLog" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "moderatorId" TEXT,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceModerationLog_itemId_createdAt_idx" ON "MarketplaceModerationLog"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceModerationLog_moderatorId_idx" ON "MarketplaceModerationLog"("moderatorId");

-- AddForeignKey
ALTER TABLE "MarketplaceModerationLog" ADD CONSTRAINT "MarketplaceModerationLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MarketplaceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceModerationLog" ADD CONSTRAINT "MarketplaceModerationLog_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
