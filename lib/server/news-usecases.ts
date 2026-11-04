import 'server-only';

import { makeFreeNewsProvider } from '@/infrastructure/news/freenewsapi.provider';
import { createNewsUseCases } from '@/application/news';

// Prefere a FreeNewsApi (5.000 req/dia gratuitos) quando a chave estiver
// configurada; caso contrário, retorna array vazio (sem notícias).
const provider = process.env.FREE_NEWS_API_KEY?.trim() ? makeFreeNewsProvider() : makeFreeNewsProvider();
const useCases = createNewsUseCases(provider);

/** Instância compartilhada dos casos de uso de Notícias (server-side). */
export const newsUseCases = useCases;