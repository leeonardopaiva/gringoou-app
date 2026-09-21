ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MODERATOR';

ALTER TABLE "Job" ADD COLUMN "galleryUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Housing" ADD COLUMN "galleryUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TYPE "CommunityGroupReportReason" AS ENUM (
  'MISINFORMATION',
  'VIOLENCE',
  'HATE_SPEECH',
  'ILLEGAL_GOODS_SERVICES',
  'SEXUALLY_EXPLICIT',
  'UNMODERATED',
  'IMPERSONATION'
);

CREATE TYPE "CommunityGroupReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

CREATE TABLE "CommunityGroupReport" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "reason" "CommunityGroupReportReason" NOT NULL,
  "status" "CommunityGroupReportStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunityGroupReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunityGroupReport_groupId_reporterId_key" ON "CommunityGroupReport"("groupId", "reporterId");
CREATE INDEX "CommunityGroupReport_status_createdAt_idx" ON "CommunityGroupReport"("status", "createdAt");
CREATE INDEX "CommunityGroupReport_groupId_createdAt_idx" ON "CommunityGroupReport"("groupId", "createdAt");

ALTER TABLE "CommunityGroupReport" ADD CONSTRAINT "CommunityGroupReport_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CommunityGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityGroupReport" ADD CONSTRAINT "CommunityGroupReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityGroupReport" ADD CONSTRAINT "CommunityGroupReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
