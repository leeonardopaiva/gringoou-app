import { NextResponse } from 'next/server';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { validateInvite } from '@/lib/invites';
import { createInviteToken, INVITE_COOKIE_NAME, INVITE_TOKEN_TTL_MS } from '@/lib/invite-token';
import { z } from 'zod';

export const runtime = 'nodejs';

const validateSchema = z.object({
  code: z.string().trim().min(1, 'Informe o codigo do convite.'),
  email: z.string().trim().email('Informe um email valido.').optional(),
});

export async function POST(request: Request) {
  const rateLimit = await consumeRateLimit({
    scope: 'invite:validate',
    key: getRateLimitKey(request),
    max: 20,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde alguns minutos.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' },
      { status: 400 },
    );
  }

  const result = await validateInvite(parsed.data.code, parsed.data.email);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  // Emite o token de curta duração para o fluxo OAuth/magic link.
  const token = createInviteToken(parsed.data.code, parsed.data.email ?? '');

  const response = NextResponse.json({ ok: true });
  response.cookies.set(INVITE_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(INVITE_TOKEN_TTL_MS / 1000),
  });

  return response;
}