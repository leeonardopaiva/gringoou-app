import 'server-only';

import { makeGoogleNewsProvider } from '@/infrastructure/news/google-news.provider';
import { makeGNewsProvider } from '@/infrastructure/news/gnews.provider';
import { createNewsUseCases } from '@/application/news';

// Prefere a GNews API (dados estruturados com imagem/descrição) quando a chave
// estiver configurada; caso contrário, usa o Google News RSS (dev/PoC).
const provider = process.env.GNEWS_API_KEY?.trim() ? makeGNewsProvider() : makeGoogleNewsProvider();
const useCases = createNewsUseCases(provider);

/** Instância compartilhada dos casos de uso de Notícias (server-side). */
export const newsUseCases = useCases;