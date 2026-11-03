import type { MarketplaceRepository } from '@/domain/marketplace/repositories/marketplace.repository';
import type { MarketplaceDetailItem, MarketplaceCondition } from '@/domain/marketplace/entities/marketplace.entity';

export interface CreateMarketplaceInput {
  title: string;
  description: string;
  category: string;
  priceCents: number | null;
  isFree: boolean;
  condition: MarketplaceCondition;
  locationLabel: string;
  regionKey: string;
  imageUrl: string | null;
  galleryUrls: string[];
  createdById: string;
}

export type CreateMarketplaceOutput = MarketplaceDetailItem;

export function makeCreateMarketplace(repo: MarketplaceRepository) {
  return async (input: CreateMarketplaceInput): Promise<CreateMarketplaceOutput> => {
    return repo.create(input);
  };
}

export type CreateMarketplace = ReturnType<typeof makeCreateMarketplace>;