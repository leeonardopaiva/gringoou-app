import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import { getAllowedRegionCountries } from '@/lib/region-country-access';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { searchCities } from '@/lib/server/cities';

export const runtime = 'nodejs';

const querySchema = z.object({
  q: z.string().trim().min(2).max(60),
  scope: z.enum(['world', 'mine']).default('world'),
});

/**
 * Autocompletar de cidades (base GeoNames local, sem serviço externo).
 * - scope=world: cidade natal, qualquer país.
 * - scope=mine: cidade atual, apenas no(s) país(es) ativo(s) do usuário (país do telefone confirmado e
 *   país da geolocalização do acesso). Admins e moderadores buscam no mundo todo.
 * Exige sessão (o middleware já bloqueia anônimos) e limita requisições por usuário.
 */
export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sua sessão expirou. Entre novamente para continuar.' }, { status: 401 });
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

  let scope: 'world' | string[] = 'world';
  if (parsed.data.scope === 'mine') {
    const allowed = await getAllowedRegionCountries({ userId: session.user.id, role: session.user.role, request });
    // null = sem restrição (admin/moderador ou sem nenhum sinal de país).
    if (allowed) scope = allowed;
  }

  const cities = searchCities(parsed.data.q, scope);
  return NextResponse.json(
    { cities },
    { headers: { 'Cache-Control': 'private, max-age=3600', Vary: 'Cookie', ...buildRateLimitHeaders(rateLimit) } },
  );
}
