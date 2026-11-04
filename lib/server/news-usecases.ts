import 'server-only';

import { makeNewsApiProvider } from '@/infrastructure/news/newsapi.provider';
import { makeFreeNewsProvider } from '@/infrastructure/news/freenewsapi.provider';
import { createNewsUseCases } from '@/application/news';

// Prefere a NewsAPI.org (URL real + imagem de capa) quando a chave estiver
// configurada; sem a chave, mantém a FreeNewsApi (títulos, link via busca).
const provider = process.env.NEWS_API_KEY?.trim() ? makeNewsApiProvider() : makeFreeNewsProvider();
const useCases = createNewsUseCases(provider);

/** Instância compartilhada dos casos de uso de Notícias (server-side). */
export const newsUseCases = useCases;