-- Comentários nas notícias e denúncias de comentários.
CREATE TABLE "NewsComment" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NewsCommentReport" (
    "commentId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsCommentReport_pkey" PRIMARY KEY ("commentId","reporterId")
);

CREATE INDEX "NewsComment_articleId_createdAt_idx" ON "NewsComment"("articleId", "createdAt");
CREATE INDEX "NewsComment_authorId_idx" ON "NewsComment"("authorId");
CREATE INDEX "NewsCommentReport_reporterId_idx" ON "NewsCommentReport"("reporterId");

ALTER TABLE "NewsComment" ADD CONSTRAINT "NewsComment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsComment" ADD CONSTRAINT "NewsComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsCommentReport" ADD CONSTRAINT "NewsCommentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "NewsComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsCommentReport" ADD CONSTRAINT "NewsCommentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
