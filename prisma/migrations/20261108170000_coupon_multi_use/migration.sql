-- Uma conta pode usar mais de um cupom (ou o mesmo cupom em mais de uma campanha, conforme o limite do cupom).
-- Cada campanha só aceita um cupom.
DROP INDEX "AdCouponRedemption_adAccountId_key";
CREATE INDEX "AdCouponRedemption_adAccountId_idx" ON "AdCouponRedemption"("adAccountId");
CREATE UNIQUE INDEX "AdCouponRedemption_bannerId_key" ON "AdCouponRedemption"("bannerId");
