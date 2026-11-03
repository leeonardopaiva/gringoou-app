import 'server-only';

import { prisma } from '@/lib/prisma';
import { makePrismaMarketplaceRepository } from '@/infrastructure/repositories/prisma-marketplace.repository';
import { createMarketplaceUseCases } from '@/application/marketplace';

const repo = makePrismaMarketplaceRepository(prisma);
const useCases = createMarketplaceUseCases(repo);

/** Instância compartilhada dos casos de uso de Marketplace (server-side). */
export const marketplaceUseCases = useCases;