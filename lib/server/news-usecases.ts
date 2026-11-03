import 'server-only';

import { makeGoogleNewsProvider } from '@/infrastructure/news/google-news.provider';
import { createNewsUseCases } from '@/application/news';

const provider = makeGoogleNewsProvider();
const useCases = createNewsUseCases(provider);

/** Instância compartilhada dos casos de uso de Notícias (server-side). */
export const newsUseCases = useCases;