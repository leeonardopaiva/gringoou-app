-- Conversas diretas entre pessoas: a conversa deixa de exigir um anúncio.
ALTER TABLE "MarketplaceConversation" ALTER COLUMN "itemId" DROP NOT NULL;

-- Curtidas de notícias (uma por usuário e notícia).
CREATE TABLE "NewsArticleLike" (
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsArticleLike_pkey" PRIMARY KEY ("userId","articleId")
);

CREATE INDEX "NewsArticleLike_articleId_idx" ON "NewsArticleLike"("articleId");

ALTER TABLE "NewsArticleLike" ADD CONSTRAINT "NewsArticleLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsArticleLike" ADD CONSTRAINT "NewsArticleLike_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
