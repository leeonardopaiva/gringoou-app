import type { MarketplaceRepository } from '@/domain/marketplace/repositories/marketplace.repository';
import type { MarketplaceListFilters, MarketplacePage } from '@/domain/marketplace/entities/marketplace.entity';

export interface ListMarketplaceInput extends MarketplaceListFilters {}

export type ListMarketplaceOutput = MarketplacePage;

export function makeListMarketplace(repo: MarketplaceRepository) {
  return async (input: ListMarketplaceInput): Promise<ListMarketplaceOutput> => {
    return repo.list(input);
  };
}

export type ListMarketplace = ReturnType<typeof makeListMarketplace>;