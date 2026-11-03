import type { MarketplaceRepository } from '@/domain/marketplace/repositories/marketplace.repository';
import type { MarketplaceDetailItem } from '@/domain/marketplace/entities/marketplace.entity';

export interface GetMarketplaceInput {
  id: string;
  viewerId: string | null;
  isAdmin: boolean;
}

export type GetMarketplaceOutput = MarketplaceDetailItem | null;

export function makeGetMarketplace(repo: MarketplaceRepository) {
  return async (input: GetMarketplaceInput): Promise<GetMarketplaceOutput> => {
    return repo.getById(input.id, input.viewerId, input.isAdmin);
  };
}

export type GetMarketplace = ReturnType<typeof makeGetMarketplace>;