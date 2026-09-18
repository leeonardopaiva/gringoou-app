-- A public business page can be promoted by one Ads account.
-- Existing Ads accounts remain valid and can be linked by their owners later.
ALTER TABLE "public"."AdAccount"
ADD COLUMN "businessId" TEXT;

CREATE UNIQUE INDEX "AdAccount_businessId_key"
ON "public"."AdAccount"("businessId");

ALTER TABLE "public"."AdAccount"
ADD CONSTRAINT "AdAccount_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
