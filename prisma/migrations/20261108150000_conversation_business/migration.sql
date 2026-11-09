-- Conversas passam a registrar o negócio de origem (mensagens separadas por negócio).
ALTER TABLE "MarketplaceConversation" ADD COLUMN "businessId" TEXT;

CREATE INDEX "MarketplaceConversation_businessId_updatedAt_idx" ON "MarketplaceConversation"("businessId", "updatedAt");

ALTER TABLE "MarketplaceConversation" ADD CONSTRAINT "MarketplaceConversation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
