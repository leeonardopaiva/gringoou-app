CREATE TYPE "public"."CommunityGroupMembershipStatus" AS ENUM ('PENDING', 'APPROVED', 'BLOCKED');

ALTER TABLE "public"."Region"
ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'US';

ALTER TABLE "public"."Job"
ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'US';

ALTER TABLE "public"."CommunityGroup"
ADD COLUMN "coverImageUrl" TEXT,
ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'US';

ALTER TABLE "public"."CommunityGroupMember"
ADD COLUMN "status" "public"."CommunityGroupMembershipStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "public"."CommunityPost"
ADD COLUMN "groupId" TEXT;

ALTER TABLE "public"."CommunityPost"
ADD CONSTRAINT "CommunityPost_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "public"."CommunityGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "CommunityGroup_countryCode_isPublic_createdAt_idx"
ON "public"."CommunityGroup"("countryCode", "isPublic", "createdAt");

CREATE INDEX "CommunityGroupMember_groupId_status_createdAt_idx"
ON "public"."CommunityGroupMember"("groupId", "status", "createdAt");

CREATE INDEX "CommunityPost_groupId_status_createdAt_idx"
ON "public"."CommunityPost"("groupId", "status", "createdAt");
