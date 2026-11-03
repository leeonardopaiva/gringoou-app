-- Timestamp set only after the phone is confirmed through Twilio Verify.
ALTER TABLE "public"."User" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);
