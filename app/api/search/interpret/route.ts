import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { generateGeminiJson } from '@/lib/gemini';

const SEARCH_CATEGORIES = ['all', 'businesses', 'events', 'posts', 'people', 'groups', 'jobs', 'interests'] as const;
type SearchCategory = (typeof SEARCH_CATEGORIES)[number];

const categoryAliases: Record<string, SearchCategory> = {
  all: 'all', tudo: 'all', todos: 'all',
  business: 'businesses', businesses: 'businesses', negocio: 'businesses', negocios: 'businesses',
  event: 'events', events: 'events', evento: 'events', eventos: 'events',
  post: 'posts', posts: 'posts', comunidade: 'posts', publicacoes: 'posts',
  person: 'people', people: 'people', pessoa: 'people', pessoas: 'people',
  group: 'groups', groups: 'groups', grupo: 'groups', grupos: 'groups',
  job: 'jobs', jobs: 'jobs', vaga: 'jobs', vagas: 'jobs', emprego: 'jobs',
  interest: 'interests', interests: 'interests', interesse: 'interests', interesses: 'interests',
};

const cleanString = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const normalizeAiFilters = (value: unknown, fallbackQuery: string) => {
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const rawCategory = cleanString(record.category, 40).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const category = categoryAliases[rawCategory] || 'all';
  const country = cleanString(record.country, 2).toUpperCase();

  return {
    q: cleanString(record.q, 80) || fallbackQuery.slice(0, 80),
    category,
    city: cleanString(record.city, 80),
    country: /^[A-Z]{2}$/.test(country) ? country : '',
    businessType: cleanString(record.businessType, 80),
  };
};

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit({
    scope: 'search:ai',
    key: getRateLimitKey(request, session.user.id),
    max: 12,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Limite de buscas com IA atingido. Tente novamente mais tarde.' }, { status: 429, headers: buildRateLimitHeaders(rateLimit) });
  }

  const body = await request.json().catch(() => null);
  const query = typeof body?.query === 'string' ? body.query.trim().slice(0, 300) : '';
  if (!query) return NextResponse.json({ error: 'Descreva o que deseja encontrar.' }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'A busca com IA não está configurada no servidor.' }, { status: 503 });

  try {
    const response = await generateGeminiJson({
      apiKey,
      contents: `Converta a busca abaixo em filtros da plataforma Gringoou. Retorne apenas JSON com q, category, city, country e businessType. Categorias válidas: all, businesses, events, posts, people, groups, jobs, interests. Use country ISO-2. Não inclua dados não presentes na frase. Busca: ${JSON.stringify(query)}`,
    });
    return NextResponse.json({ filters: normalizeAiFilters(response.data, query), model: response.model });
  } catch (error) {
    console.error('Search interpretation failed:', error);
    return NextResponse.json({ filters: normalizeAiFilters({}, query), degraded: true });
  }
}
