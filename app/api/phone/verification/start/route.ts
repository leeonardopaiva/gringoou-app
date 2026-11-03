import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import {
  isPhoneBlocked,
  isPhoneVerificationConfigured,
  sendPhoneVerificationCode,
  toE164Phone,
} from '@/lib/phone-verification';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const startSchema = z.object({
  phone: z.string().trim().min(8, 'Informe um telefone valido').max(30),
});

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
  }

  if (!isPhoneVerificationConfigured) {
    return NextResponse.json(
      { error: 'A verificacao por telefone ainda nao esta disponivel.' },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = startSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Telefone invalido.' },
      { status: 400 },
    );
  }

  const phoneE164 = toE164Phone(parsed.data.phone);

  if (!phoneE164) {
    return NextResponse.json(
      { error: 'Use o telefone com o codigo do pais, por exemplo +1 305 000 0000.' },
      { status: 400 },
    );
  }

  // Refused before any SMS is sent, so blocked numbers cost nothing.
  if (isPhoneBlocked(phoneE164)) {
    return NextResponse.json(
      { error: 'Este numero nao esta disponivel nesta fase de acesso.' },
      { status: 403 },
    );
  }

  // Per-user limit stops one account from spamming codes. The per-number limit
  // stops SMS pumping against a single target number.
  const userLimit = await consumeRateLimit({
    scope: 'phone:verify-start:user',
    key: getRateLimitKey(request, session.user.id),
    max: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!userLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitos codigos solicitados. Tente novamente mais tarde.' },
      { status: 429, headers: buildRateLimitHeaders(userLimit) },
    );
  }

  const phoneLimit = await consumeRateLimit({
    scope: 'phone:verify-start:number',
    key: `phone:${phoneE164}`,
    max: 3,
    windowMs: 60 * 60 * 1000,
  });

  if (!phoneLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitos codigos enviados para este numero. Tente novamente mais tarde.' },
      { status: 429, headers: buildRateLimitHeaders(phoneLimit) },
    );
  }

  try {
    await sendPhoneVerificationCode({ userId: session.user.id, phoneE164 });
  } catch (error) {
    const twilioCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;

    // 21211: invalid number. 21614: not a mobile number. 21608: trial account
    // can only send to numbers verified in the Twilio console.
    if (twilioCode === 21211 || twilioCode === 21614) {
      return NextResponse.json(
        { error: 'Nao foi possivel enviar SMS para este numero. Confira o telefone.' },
        { status: 400 },
      );
    }

    if (twilioCode === 21608) {
      return NextResponse.json(
        { error: 'Este numero ainda nao esta verificado na conta de teste do Twilio.' },
        { status: 400 },
      );
    }

    console.error('[phone-verification] falha ao enviar codigo', twilioCode ?? error);
    return NextResponse.json(
      { error: 'Nao foi possivel enviar o codigo agora. Tente novamente.' },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    phone: phoneE164,
    message: 'Enviamos um codigo por SMS.',
  });
}
