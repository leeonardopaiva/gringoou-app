import type {
  MarketplaceDetailItem,
  MarketplaceListFilters,
  MarketplaceListItem,
  MarketplaceModerationDecision,
  MarketplaceModerationPage,
  MarketplacePage,
  MarketplaceStatus,
} from '../entities/marketplace.entity';

/** Contrato do repositório de Marketplace — a camada de domínio depende apenas desta interface. */
export interface MarketplaceRepository {
  /** Lista anúncios visíveis para o usuário. */
  list(filters: MarketplaceListFilters): Promise<MarketplacePage>;

  /** Obtém detalhe de um anúncio pelo ID. */
  getById(id: string, viewerId: string | null, isAdmin: boolean, canModerate?: boolean): Promise<MarketplaceDetailItem | null>;

  /** Cria um anúncio. */
  create(input: {
    title: string;
    description: string;
    category: string;
    priceCents: number | null;
    isFree: boolean;
    condition: MarketplaceListItem['condition'];
    locationLabel: string;
    regionKey: string;
    imageUrl: string | null;
    galleryUrls: string[];
    createdById: string;
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<MarketplaceDetailItem>;

  /** Atualiza um anúncio (somente proprietário/admin). */
  update(
    id: string,
    viewerId: string,
    isAdmin: boolean,
    data: Partial<{
      title: string;
      description: string;
      category: string;
      priceCents: number | null;
      isFree: boolean;
      condition: MarketplaceListItem['condition'];
      locationLabel: string;
      regionKey: string;
      imageUrl: string | null;
      galleryUrls: string[];
      status: MarketplaceListItem['status'];
      latitude?: number | null;
      longitude?: number | null;
    }>,
  ): Promise<MarketplaceDetailItem | null>;

  /** Exclui um anúncio (somente proprietário/admin). */
  remove(id: string, viewerId: string, isAdmin: boolean): Promise<boolean>;

  /** Lista anúncios para a fila de moderação (somente moderadores/admin). */
  listForModeration(input: { statuses: MarketplaceStatus[]; page?: number; pageSize?: number }): Promise<MarketplaceModerationPage>;

  /** Aplica uma decisão de moderação e registra o histórico. Lança MarketplaceRuleError. */
  moderate(input: { id: string; moderatorId: string; decision: MarketplaceModerationDecision; reason: string | null }): Promise<void>;

  /** Alterna favorito do usuário. */
  toggleFavorite(id: string, viewerId: string): Promise<{ isFavorite: boolean }>;
}