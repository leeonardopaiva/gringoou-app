import { NextResponse } from 'next/server';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import {
  PRE_LAUNCH_COOKIE_MAX_AGE_SECONDS,
  PRE_LAUNCH_COOKIE_NAME,
  createPreLaunchToken,
  isPreLaunchGateEnabled,
  isValidPreLaunchCode,
} from '@/lib/pre-launch-gate';

export const runtime = 'nodejs';

// The access code is validated exclusively on the server. The expected value
// (PRE_LAUNCH_ACCESS_CODE) is never returned, logged or sent to the client.
export async function POST(request: Request) {
  if (!isPreLaunchGateEnabled()) {
    // Gate disabled: nothing to validate, behave as if already authorized.
    return NextResponse.json({ ok: true });
  }

  const rateLimit = await consumeRateLimit({
    scope: 'pre-launch:verify',
    key: getRateLimitKey(request),
    max: 8,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === 'string' ? body.code : '';

  if (!isValidPreLaunchCode(code)) {
    return NextResponse.json({ error: 'Codigo de acesso invalido.' }, { status: 401 });
  }

  const token = await createPreLaunchToken();
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: PRE_LAUNCH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PRE_LAUNCH_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
