import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { searchCities } from '@/lib/server/cities';

export const runtime = 'nodejs';

const querySchema = z.object({
  q: z.string().trim().min(2).max(60),
  scope: z.enum(['world', 'us']).default('world'),
});

/**
 * Autocompletar de cidades (base GeoNames local, sem serviço externo).
 * - scope=world: cidade natal, qualquer país.
 * - scope=us: cidade atual, apenas Estados Unidos.
 * Exige sessão (o middleware já bloqueia anônimos) e limita requisições por usuário.
 */
export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    scope: 'places:cities',
    key: getRateLimitKey(request, session.user.id),
    max: 120,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas buscas. Aguarde um instante.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get('q') ?? '',
    scope: searchParams.get('scope') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ cities: [] });
  }

  const cities = searchCities(parsed.data.q, parsed.data.scope);
  return NextResponse.json(
    { cities },
    { headers: { 'Cache-Control': 'private, max-age=3600', ...buildRateLimitHeaders(rateLimit) } },
  );
}
