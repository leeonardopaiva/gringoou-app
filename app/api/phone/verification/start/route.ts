import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import {
  getPhoneBlockMessage,
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
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  if (!isPhoneVerificationConfigured) {
    return NextResponse.json(
      { error: 'A verificação por telefone ainda não está disponível.' },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = startSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Telefone inválido.' },
      { status: 400 },
    );
  }

  const phoneE164 = toE164Phone(parsed.data.phone);

  if (!phoneE164) {
    return NextResponse.json(
      { error: 'Use o telefone com o código do país, por exemplo +1 305 000 0000.' },
      { status: 400 },
    );
  }

  // Refused before any SMS is sent, so blocked numbers cost nothing.
  const blockMessage = getPhoneBlockMessage(phoneE164);
  if (blockMessage) {
    return NextResponse.json({ error: blockMessage }, { status: 403 });
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
      { error: 'Muitos códigos solicitados. Tente novamente mais tarde.' },
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
      { error: 'Muitos códigos enviados para este número. Tente novamente mais tarde.' },
      { status: 429, headers: buildRateLimitHeaders(phoneLimit) },
    );
  }

  try {
    await sendPhoneVerificationCode({ userId: session.user.id, phoneE164 });
  } catch (error) {
    const twilioCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;

    // 21211: invalid number. 21614: not a mobile number. 21608: trial account
    // can only send to numbers verified in the Twilio console.
    // Verify: 60200 invalid number, 60205 landline/no SMS. 60203: too many sends to this number.
    if (twilioCode === 60203) {
      return NextResponse.json(
        { error: 'Muitos códigos enviados para este número. Tente novamente mais tarde.' },
        { status: 429 },
      );
    }

    if (twilioCode === 21211 || twilioCode === 21614 || twilioCode === 60200 || twilioCode === 60205) {
      return NextResponse.json(
        { error: 'Não foi possível enviar SMS para este número. Confira o telefone.' },
        { status: 400 },
      );
    }

    // 21608: the Twilio account has no approved Primary Compliance Profile (or is a trial) and
    // may only message verified caller IDs. A configuration issue, so it is logged too.
    if (twilioCode === 21608) {
      console.error('[phone-verification] Twilio 21608: conta sem Primary Compliance Profile aprovado');
      return NextResponse.json(
        { error: 'Não conseguimos enviar SMS para este número no momento. Tente novamente mais tarde.' },
        { status: 400 },
      );
    }

    // 60410: blocked by Twilio's fraud guard. 60605 / 21408: country not enabled in the
    // Twilio geo permissions. These depend on the number, so they are reported as such.
    if (twilioCode === 60410 || twilioCode === 60605 || twilioCode === 21408) {
      return NextResponse.json(
        { error: 'Não conseguimos enviar SMS para este número. Tente outro telefone.' },
        { status: 400 },
      );
    }

    // Everything else is an account/configuration problem (bad credentials 20003, Verify
    // service not found 20404, sender not owned 21606/21212, ...). Log all the details so the
    // Vercel logs show the real cause without exposing it to the user.
    const details = error as { status?: number; code?: number; message?: string; moreInfo?: string };
    console.error('[phone-verification] falha ao enviar código', {
      twilioCode,
      httpStatus: details?.status,
      message: details?.message ?? String(error),
      moreInfo: details?.moreInfo,
      usingVerifyService: Boolean(process.env.TWILIO_VERIFY_SERVICE_SID?.trim()),
    });
    return NextResponse.json(
      { error: 'Não foi possível enviar o código agora. Tente novamente.' },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    phone: phoneE164,
    message: 'Enviamos um código por SMS.',
  });
}
