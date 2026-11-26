-- Proof of acceptance of the Terms of Use / Privacy Policy: when, and which version (lib/legal/company.ts).
ALTER TABLE "public"."User" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" TEXT;
