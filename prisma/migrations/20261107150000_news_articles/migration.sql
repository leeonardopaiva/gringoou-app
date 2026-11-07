-- CreateEnum
CREATE TYPE "NewsArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "category" TEXT NOT NULL,
    "regionKey" TEXT,
    "source" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "status" "NewsArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsArticle_status_publishedAt_id_idx" ON "NewsArticle"("status", "publishedAt", "id");
CREATE INDEX "NewsArticle_status_regionKey_publishedAt_idx" ON "NewsArticle"("status", "regionKey", "publishedAt");
CREATE INDEX "NewsArticle_status_category_publishedAt_idx" ON "NewsArticle"("status", "category", "publishedAt");
CREATE INDEX "NewsArticle_authorId_createdAt_idx" ON "NewsArticle"("authorId", "createdAt");

-- AddForeignKey
ALTER TABLE "NewsArticle" ADD CONSTRAINT "NewsArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
