import type { MarketplaceRepository } from '@/domain/marketplace/repositories/marketplace.repository';

export interface RemoveMarketplaceInput {
  id: string;
  viewerId: string;
  isAdmin: boolean;
}

export type RemoveMarketplaceOutput = boolean;

export function makeRemoveMarketplace(repo: MarketplaceRepository) {
  return async (input: RemoveMarketplaceInput): Promise<RemoveMarketplaceOutput> => {
    return repo.remove(input.id, input.viewerId, input.isAdmin);
  };
}

export type RemoveMarketplace = ReturnType<typeof makeRemoveMarketplace>;