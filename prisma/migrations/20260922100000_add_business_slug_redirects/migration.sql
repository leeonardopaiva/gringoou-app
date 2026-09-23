CREATE TABLE "BusinessSlugRedirect" (
  "slug" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessSlugRedirect_pkey" PRIMARY KEY ("slug")
);

CREATE INDEX "BusinessSlugRedirect_businessId_idx" ON "BusinessSlugRedirect"("businessId");

ALTER TABLE "BusinessSlugRedirect" ADD CONSTRAINT "BusinessSlugRedirect_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
