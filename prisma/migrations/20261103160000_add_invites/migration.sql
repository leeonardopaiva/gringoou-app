-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'ACTIVE',
    "email" TEXT,
    "usageLimit" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "revokedById" TEXT,
    "waitlistEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteUsage" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invite_codeHash_key" ON "Invite"("codeHash");

-- CreateIndex
CREATE INDEX "Invite_status_createdAt_idx" ON "Invite"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Invite_email_status_idx" ON "Invite"("email", "status");

-- CreateIndex
CREATE INDEX "Invite_createdById_createdAt_idx" ON "Invite"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "Invite_waitlistEntryId_idx" ON "Invite"("waitlistEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteUsage_inviteId_userId_key" ON "InviteUsage"("inviteId", "userId");

-- CreateIndex
CREATE INDEX "InviteUsage_userId_createdAt_idx" ON "InviteUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "InviteUsage_inviteId_createdAt_idx" ON "InviteUsage"("inviteId", "createdAt");

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_waitlistEntryId_fkey" FOREIGN KEY ("waitlistEntryId") REFERENCES "WaitlistEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteUsage" ADD CONSTRAINT "InviteUsage_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteUsage" ADD CONSTRAINT "InviteUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;