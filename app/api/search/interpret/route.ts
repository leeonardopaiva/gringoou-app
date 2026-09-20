import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';

const interpretedSearchSchema = z.object({
  q: z.string().trim().max(80).default(''),
  category: z.enum(['all', 'businesses', 'events', 'posts', 'people', 'groups', 'jobs', 'interests']).default('all'),
  city: z.string().trim().max(80).default(''),
  country: z.string().trim().max(2).transform((value) => value.toUpperCase()).default(''),
  businessType: z.string().trim().max(80).default(''),
});

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
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Converta a busca abaixo em filtros da plataforma Gringoou. Retorne apenas JSON com q, category, city, country e businessType. Categorias válidas: all, businesses, events, posts, people, groups, jobs, interests. Use country ISO-2. Não inclua dados não presentes na frase. Busca: ${JSON.stringify(query)}`,
      config: { temperature: 0, responseMimeType: 'application/json' },
    });
    const parsedJson = JSON.parse(response.text || '{}');
    const parsed = interpretedSearchSchema.safeParse(parsedJson);
    if (!parsed.success) throw new Error('INVALID_AI_RESPONSE');
    return NextResponse.json({ filters: parsed.data });
  } catch (error) {
    console.error('Search interpretation failed:', error);
    return NextResponse.json({ error: 'Não foi possível interpretar a busca agora.' }, { status: 502 });
  }
}
