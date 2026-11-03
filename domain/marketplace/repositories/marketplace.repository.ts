import type {
  MarketplaceDetailItem,
  MarketplaceListFilters,
  MarketplaceListItem,
  MarketplacePage,
} from '../entities/marketplace.entity';

/** Contrato do repositório de Marketplace — a camada de domínio depende apenas desta interface. */
export interface MarketplaceRepository {
  /** Lista anúncios visíveis para o usuário. */
  list(filters: MarketplaceListFilters): Promise<MarketplacePage>;

  /** Obtém detalhe de um anúncio pelo ID. */
  getById(id: string, viewerId: string | null, isAdmin: boolean): Promise<MarketplaceDetailItem | null>;

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
    }>,
  ): Promise<MarketplaceDetailItem | null>;

  /** Exclui um anúncio (somente proprietário/admin). */
  remove(id: string, viewerId: string, isAdmin: boolean): Promise<boolean>;

  /** Alterna favorito do usuário. */
  toggleFavorite(id: string, viewerId: string): Promise<{ isFavorite: boolean }>;
}