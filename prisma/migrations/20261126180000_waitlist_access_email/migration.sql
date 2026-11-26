-- Tracks the access-granted e-mail sent to each waiting-list entry.
ALTER TABLE "public"."WaitlistEntry" ADD COLUMN "accessEmailSentAt" TIMESTAMP(3),
ADD COLUMN "accessEmailError" TEXT;
