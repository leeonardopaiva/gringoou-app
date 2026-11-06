import type { MarketplaceRepository } from '@/domain/marketplace/repositories/marketplace.repository';
import type {
  MarketplaceModerationDecision,
  MarketplaceModerationPage,
  MarketplaceStatus,
} from '@/domain/marketplace/entities/marketplace.entity';

export interface ListModerationInput {
  statuses: MarketplaceStatus[];
  page?: number;
  pageSize?: number;
}

export function makeListModeration(repo: MarketplaceRepository) {
  return (input: ListModerationInput): Promise<MarketplaceModerationPage> => repo.listForModeration(input);
}
export type ListModeration = ReturnType<typeof makeListModeration>;

export interface ModerateMarketplaceInput {
  id: string;
  moderatorId: string;
  decision: MarketplaceModerationDecision;
  reason: string | null;
}

export function makeModerateMarketplace(repo: MarketplaceRepository) {
  return (input: ModerateMarketplaceInput): Promise<void> => repo.moderate(input);
}
export type ModerateMarketplace = ReturnType<typeof makeModerateMarketplace>;
