-- Pacotes de anúncios editáveis e cupons de cortesia.
CREATE TABLE "AdPlanConfig" (
    "plan" "AdPlan" NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyPriceCents" INTEGER NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "estimatedImpressions" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "highlights" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdPlanConfig_pkey" PRIMARY KEY ("plan")
);

CREATE TABLE "AdCoupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "plan" "AdPlan",
    "assignedEmail" TEXT,
    "creditCents" INTEGER,
    "maxRedemptions" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCoupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdCouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "bannerId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdCouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdCoupon_code_key" ON "AdCoupon"("code");
CREATE INDEX "AdCoupon_isActive_expiresAt_idx" ON "AdCoupon"("isActive", "expiresAt");
CREATE UNIQUE INDEX "AdCouponRedemption_adAccountId_key" ON "AdCouponRedemption"("adAccountId");
CREATE INDEX "AdCouponRedemption_couponId_idx" ON "AdCouponRedemption"("couponId");

ALTER TABLE "AdCouponRedemption" ADD CONSTRAINT "AdCouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "AdCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
