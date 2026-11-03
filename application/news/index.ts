import type { NewsProvider } from '@/domain/news/repositories/news.repository';
import { makeListNews, type ListNews } from './use-cases/list-news.usecase';

export interface NewsUseCases {
  listNews: ListNews;
}

export function createNewsUseCases(provider: NewsProvider): NewsUseCases {
  return {
    listNews: makeListNews(provider),
  };
}

export type { ListNewsInput, ListNewsOutput } from './use-cases/list-news.usecase';
export { makeListNews };