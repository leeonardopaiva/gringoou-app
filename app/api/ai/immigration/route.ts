import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import { isOperationalFeatureEnabled } from '@/lib/operational-flags';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const requestSchema = z.object({ query: z.string().trim().min(2).max(500) });

export async function POST(request: Request) {
  if (!isOperationalFeatureEnabled('aiAssistant')) {
    return NextResponse.json(
      { error: 'O assistente esta temporariamente pausado.' },
      { status: 503, headers: { 'Retry-After': '300' } },
    );
  }

  // Defesa em profundidade: o middleware já exige login, mas a rota gasta dinheiro (IA) e não confia nisso.
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const rateLimit = await consumeRateLimit({
    scope: 'ai:immigration',
    key: getRateLimitKey(request, session.user.id),
    max: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Limite do assistente atingido. Tente novamente mais tarde.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI assistant is not configured on the server' }, { status: 503 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Pergunta invalida. Use entre 2 e 500 caracteres.' }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `O usuario brasileiro no exterior tem a seguinte duvida: "${parsed.data.query}". Responda de forma amigavel, concisa e informativa em portugues, agindo como um consultor experiente da comunidade Gringoou.`,
      config: { temperature: 0.7, topP: 0.95, maxOutputTokens: 800 },
    });

    return NextResponse.json({ answer: response.text ?? 'Nao foi possivel gerar uma resposta agora.' });
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { error: 'Nao foi possivel responder agora. Tente novamente mais tarde.' },
      { status: 500 },
    );
  }
}
