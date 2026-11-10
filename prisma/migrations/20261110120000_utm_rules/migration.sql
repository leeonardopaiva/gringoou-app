-- Regras de UTM (overrides dos padrões do código) e permissão para gerenciá-las.
ALTER TABLE "User" ADD COLUMN "canManageUtm" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "UtmRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL,
    "medium" TEXT NOT NULL,
    "campaign" TEXT NOT NULL,
    "content" TEXT,
    "term" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UtmRule_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AnalyticsEvent" ADD COLUMN "utm" JSONB;

CREATE UNIQUE INDEX "UtmRule_key_key" ON "UtmRule"("key");
