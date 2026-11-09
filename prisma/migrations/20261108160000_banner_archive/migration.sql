-- Campanhas removidas do painel pelo proprietário ficam arquivadas (histórico financeiro preservado).
ALTER TABLE "Banner" ADD COLUMN "archivedAt" TIMESTAMP(3);
