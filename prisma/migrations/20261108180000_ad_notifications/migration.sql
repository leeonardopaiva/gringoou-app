-- Alertas do painel do negócio.
CREATE TABLE "AdNotification" (
    "id" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdNotification_adAccountId_createdAt_idx" ON "AdNotification"("adAccountId", "createdAt");
CREATE INDEX "AdNotification_adAccountId_readAt_idx" ON "AdNotification"("adAccountId", "readAt");
