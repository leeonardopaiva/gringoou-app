-- Country of the verified phone number and the country the user connected from
-- when the phone was confirmed.

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN "phoneCountry" TEXT, ADD COLUMN "accessCountry" TEXT;
