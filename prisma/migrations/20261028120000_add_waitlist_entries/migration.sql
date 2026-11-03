-- Pre-launch waiting list captured from the landing page. Access is released
-- gradually by moving entries from PENDING to INVITED.

-- CreateEnum
CREATE TYPE "public"."WaitlistStatus" AS ENUM ('PENDING', 'INVITED', 'ACTIVE');

-- CreateTable
CREATE TABLE "public"."WaitlistEntry" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "country" TEXT,
    "status" "public"."WaitlistStatus" NOT NULL DEFAULT 'PENDING',
    "invitedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_email_key" ON "public"."WaitlistEntry"("email");

-- CreateIndex
CREATE INDEX "WaitlistEntry_status_createdAt_idx" ON "public"."WaitlistEntry"("status", "createdAt");
