import type { MarketplaceRepository } from '@/domain/marketplace/repositories/marketplace.repository';

export interface ToggleFavoriteInput {
  id: string;
  viewerId: string;
}

export type ToggleFavoriteOutput = { isFavorite: boolean };

export function makeToggleFavorite(repo: MarketplaceRepository) {
  return async (input: ToggleFavoriteInput): Promise<ToggleFavoriteOutput> => {
    return repo.toggleFavorite(input.id, input.viewerId);
  };
}

export type ToggleFavorite = ReturnType<typeof makeToggleFavorite>;