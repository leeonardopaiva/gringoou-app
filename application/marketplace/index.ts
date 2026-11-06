import type { MarketplaceRepository } from '@/domain/marketplace/repositories/marketplace.repository';
import { makeListMarketplace, type ListMarketplace } from './use-cases/list-marketplace.usecase';
import { makeGetMarketplace, type GetMarketplace } from './use-cases/get-marketplace.usecase';
import { makeCreateMarketplace, type CreateMarketplace } from './use-cases/create-marketplace.usecase';
import { makeUpdateMarketplace, type UpdateMarketplace } from './use-cases/update-marketplace.usecase';
import { makeRemoveMarketplace, type RemoveMarketplace } from './use-cases/remove-marketplace.usecase';
import { makeListModeration, makeModerateMarketplace, type ListModeration, type ModerateMarketplace } from './use-cases/moderate-marketplace.usecase';
import { makeToggleFavorite, type ToggleFavorite } from './use-cases/toggle-favorite.usecase';

export interface MarketplaceUseCases {
  listMarketplace: ListMarketplace;
  getMarketplace: GetMarketplace;
  createMarketplace: CreateMarketplace;
  updateMarketplace: UpdateMarketplace;
  removeMarketplace: RemoveMarketplace;
  toggleFavorite: ToggleFavorite;
  listModeration: ListModeration;
  moderateMarketplace: ModerateMarketplace;
}

export function createMarketplaceUseCases(repo: MarketplaceRepository): MarketplaceUseCases {
  return {
    listMarketplace: makeListMarketplace(repo),
    getMarketplace: makeGetMarketplace(repo),
    createMarketplace: makeCreateMarketplace(repo),
    updateMarketplace: makeUpdateMarketplace(repo),
    removeMarketplace: makeRemoveMarketplace(repo),
    toggleFavorite: makeToggleFavorite(repo),
    listModeration: makeListModeration(repo),
    moderateMarketplace: makeModerateMarketplace(repo),
  };
}

export type { ListMarketplaceInput, ListMarketplaceOutput } from './use-cases/list-marketplace.usecase';
export type { GetMarketplaceInput, GetMarketplaceOutput } from './use-cases/get-marketplace.usecase';
export type { CreateMarketplaceInput, CreateMarketplaceOutput } from './use-cases/create-marketplace.usecase';
export type { UpdateMarketplaceInput, UpdateMarketplaceOutput } from './use-cases/update-marketplace.usecase';
export type { RemoveMarketplaceInput, RemoveMarketplaceOutput } from './use-cases/remove-marketplace.usecase';
export type { ToggleFavoriteInput, ToggleFavoriteOutput } from './use-cases/toggle-favorite.usecase';
export { makeListMarketplace, makeGetMarketplace, makeCreateMarketplace, makeUpdateMarketplace, makeRemoveMarketplace, makeToggleFavorite };