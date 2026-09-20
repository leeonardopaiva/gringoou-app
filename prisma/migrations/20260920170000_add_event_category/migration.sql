ALTER TABLE "public"."Event" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Outros';
CREATE INDEX "Event_category_regionKey_startsAt_idx" ON "public"."Event"("category", "regionKey", "startsAt");
