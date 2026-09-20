CREATE TABLE "public"."CommunityPostPreference" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "isInterested" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunityPostPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."UserMute" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mutedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserMute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunityPostPreference_postId_userId_key" ON "public"."CommunityPostPreference"("postId", "userId");
CREATE INDEX "CommunityPostPreference_userId_isSaved_updatedAt_idx" ON "public"."CommunityPostPreference"("userId", "isSaved", "updatedAt");
CREATE UNIQUE INDEX "UserMute_userId_mutedUserId_key" ON "public"."UserMute"("userId", "mutedUserId");
CREATE INDEX "UserMute_mutedUserId_idx" ON "public"."UserMute"("mutedUserId");

ALTER TABLE "public"."CommunityPostPreference" ADD CONSTRAINT "CommunityPostPreference_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CommunityPostPreference" ADD CONSTRAINT "CommunityPostPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."UserMute" ADD CONSTRAINT "UserMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."UserMute" ADD CONSTRAINT "UserMute_mutedUserId_fkey" FOREIGN KEY ("mutedUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
