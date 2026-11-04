import 'server-only';

import { makeWebzProvider } from '@/infrastructure/news/webz.provider';
import { makeNewsDataProvider } from '@/infrastructure/news/newsdata.provider';
import { makeNewsApiProvider } from '@/infrastructure/news/newsapi.provider';
import { makeFreeNewsProvider } from '@/infrastructure/news/freenewsapi.provider';
import { createNewsUseCases } from '@/application/news';

// Preferência: Webz.io (pré-pronto; ativa quando WEBZ_API_KEY existir) →
// NewsData.io (link/imagem reais) → NewsAPI.org → FreeNewsApi.
// O fallback curado dos providers evita tela vazia quando não há chave, feed
// vazio ou erro/rate-limit da API.
const provider = process.env.WEBZ_API_KEY?.trim()
  ? makeWebzProvider()
  : process.env.NEWSDATA_API_KEY?.trim()
    ? makeNewsDataProvider()
    : process.env.NEWS_API_KEY?.trim()
      ? makeNewsApiProvider()
      : makeFreeNewsProvider();
const useCases = createNewsUseCases(provider);

/** Instância compartilhada dos casos de uso de Notícias (server-side). */
export const newsUseCases = useCases;