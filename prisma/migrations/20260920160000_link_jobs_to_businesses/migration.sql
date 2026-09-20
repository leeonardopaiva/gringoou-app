ALTER TABLE "public"."Job" ADD COLUMN "businessId" TEXT;
CREATE INDEX "Job_businessId_createdAt_idx" ON "public"."Job"("businessId", "createdAt");
ALTER TABLE "public"."Job" ADD CONSTRAINT "Job_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
