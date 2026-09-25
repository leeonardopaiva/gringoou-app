ALTER TYPE "CommunityGroupMemberRole" ADD VALUE IF NOT EXISTS 'MODERATOR';

ALTER TABLE "Business" ADD COLUMN "ownershipVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN "ownershipVerifiedAt" TIMESTAMP(3);
ALTER TABLE "PostComment" ADD COLUMN "parentId" TEXT;

CREATE TABLE "JobComment" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "parentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HousingComment" (
  "id" TEXT NOT NULL,
  "housingId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "parentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HousingComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PostComment_parentId_createdAt_idx" ON "PostComment"("parentId", "createdAt");
CREATE INDEX "JobComment_jobId_createdAt_idx" ON "JobComment"("jobId", "createdAt");
CREATE INDEX "JobComment_parentId_createdAt_idx" ON "JobComment"("parentId", "createdAt");
CREATE INDEX "HousingComment_housingId_createdAt_idx" ON "HousingComment"("housingId", "createdAt");
CREATE INDEX "HousingComment_parentId_createdAt_idx" ON "HousingComment"("parentId", "createdAt");

ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobComment" ADD CONSTRAINT "JobComment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobComment" ADD CONSTRAINT "JobComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobComment" ADD CONSTRAINT "JobComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "JobComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HousingComment" ADD CONSTRAINT "HousingComment_housingId_fkey" FOREIGN KEY ("housingId") REFERENCES "Housing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HousingComment" ADD CONSTRAINT "HousingComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HousingComment" ADD CONSTRAINT "HousingComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "HousingComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
