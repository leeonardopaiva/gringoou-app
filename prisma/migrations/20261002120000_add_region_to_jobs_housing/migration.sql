-- Add region scoping to Job and Housing so listings can be filtered by the
-- viewer's region, matching the Business/Event behaviour.

ALTER TABLE "public"."Job" ADD COLUMN "regionKey" TEXT;
ALTER TABLE "public"."Housing" ADD COLUMN "regionKey" TEXT;

-- Backfill existing rows from the Region catalog by matching the free-text
-- locationLabel against the region label or its city prefix.
UPDATE "public"."Job" AS j
SET "regionKey" = r."key"
FROM "public"."Region" AS r
WHERE j."regionKey" IS NULL
  AND (j."locationLabel" = r."label" OR j."locationLabel" ILIKE r."city" || ',%');

UPDATE "public"."Housing" AS h
SET "regionKey" = r."key"
FROM "public"."Region" AS r
WHERE h."regionKey" IS NULL
  AND (h."locationLabel" = r."label" OR h."locationLabel" ILIKE r."city" || ',%');

CREATE INDEX "Job_isActive_regionKey_createdAt_idx" ON "public"."Job"("isActive", "regionKey", "createdAt");
CREATE INDEX "Housing_isActive_regionKey_createdAt_idx" ON "public"."Housing"("isActive", "regionKey", "createdAt");
