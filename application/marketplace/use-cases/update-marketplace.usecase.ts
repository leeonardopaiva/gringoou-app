import type { MarketplaceRepository } from '@/domain/marketplace/repositories/marketplace.repository';
import type { MarketplaceDetailItem, MarketplaceCondition, MarketplaceStatus } from '@/domain/marketplace/entities/marketplace.entity';

export interface UpdateMarketplaceInput {
  id: string;
  viewerId: string;
  isAdmin: boolean;
  data: Partial<{
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
    status: MarketplaceStatus;
    latitude?: number | null;
    longitude?: number | null;
  }>;
}

export type UpdateMarketplaceOutput = MarketplaceDetailItem | null;

export function makeUpdateMarketplace(repo: MarketplaceRepository) {
  return async (input: UpdateMarketplaceInput): Promise<UpdateMarketplaceOutput> => {
    return repo.update(input.id, input.viewerId, input.isAdmin, input.data);
  };
}

export type UpdateMarketplace = ReturnType<typeof makeUpdateMarketplace>;