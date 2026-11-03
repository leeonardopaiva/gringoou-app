import type { NewsFeed, NewsListFilters } from '../entities/news.entity';

/**
 * Contrato do provedor de Notícias — a camada de domínio depende apenas desta
 * interface. Permite trocar o provedor (Google News RSS em dev/PoC, provedor
 * licenciado em produção) sem refatorar a interface.
 */
export interface NewsProvider {
  readonly name: string;

  /** Busca notícias normalizadas conforme os filtros informados. */
  fetch(filters: NewsListFilters): Promise<NewsFeed>;
}