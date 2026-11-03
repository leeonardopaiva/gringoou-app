import type { NewsProvider } from '@/domain/news/repositories/news.repository';
import type { NewsFeed, NewsListFilters } from '@/domain/news/entities/news.entity';

export interface ListNewsInput extends NewsListFilters {}

export type ListNewsOutput = NewsFeed;

export function makeListNews(provider: NewsProvider) {
  return async (input: ListNewsInput): Promise<ListNewsOutput> => {
    return provider.fetch(input);
  };
}

export type ListNews = ReturnType<typeof makeListNews>;