import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import {
  getAccessCountry,
  getPhoneBlockMessage,
  getPhoneCountry,
  isBypassNumber,
  isPhoneVerificationConfigured,
  sendPhoneVerificationCode,
  toE164Phone,
} from '@/lib/phone-verification';
import { assessPhoneRisk, getPhoneRiskConfig } from '@/lib/phone-risk';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRequestIp } from '@/lib/rate-limit';

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

  // Free checks first (no SMS, no paid lookup): a confirmed account does not need another code,
  // and a number already confirmed by another account is refused before anything is sent.
  const [currentUser, numberOwner] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { phoneVerifiedAt: true } }),
    prisma.user.findFirst({
      where: { phone: phoneE164, phoneVerifiedAt: { not: null }, NOT: { id: session.user.id } },
      select: { id: true },
    }),
  ]);

  if (currentUser?.phoneVerifiedAt) {
    return NextResponse.json({ error: 'Seu telefone já está confirmado.' }, { status: 409 });
  }

  if (numberOwner) {
    return NextResponse.json({ error: 'Este telefone já está vinculado a outra conta.' }, { status: 409 });
  }

  // Layered rate limits (SMS pumping and account-farming defense), checked one at a time so a
  // request refused by a specific limit does not consume the broader counters.
  const risk = getPhoneRiskConfig();
  const hour = 60 * 60 * 1000;
  const phoneCountry = getPhoneCountry(phoneE164) ?? 'XX';
  const ip = getRequestIp(request);
  const userId = session.user.id;

  const limits: Array<{ message: string; run: () => ReturnType<typeof consumeRateLimit> }> = [
    {
      message: 'Aguarde um pouco antes de pedir outro código.',
      run: () => consumeRateLimit({ scope: 'phone:verify-start:cooldown', key: userId, max: 1, windowMs: risk.resendCooldownSeconds * 1000 }),
    },
    {
      message: 'Muitos códigos solicitados. Tente novamente mais tarde.',
      run: () => consumeRateLimit({ scope: 'phone:verify-start:user', key: userId, max: 5, windowMs: hour }),
    },
    {
      message: 'Muitos códigos solicitados hoje. Tente novamente amanhã.',
      run: () => consumeRateLimit({ scope: 'phone:verify-start:user-day', key: userId, max: risk.userDailyCap, windowMs: 24 * hour }),
    },
    {
      message: 'Muitos códigos solicitados desta rede. Tente novamente mais tarde.',
      run: () => consumeRateLimit({ scope: 'phone:verify-start:ip', key: ip, max: risk.ipHourlyCap, windowMs: hour }),
    },
    {
      message: 'Muitos códigos enviados para este número. Tente novamente mais tarde.',
      run: () => consumeRateLimit({ scope: 'phone:verify-start:number', key: phoneE164, max: 3, windowMs: hour }),
    },
    {
      message: 'Estamos com muitos pedidos de código agora. Tente novamente em alguns minutos.',
      run: () => consumeRateLimit({ scope: 'phone:verify-start:country', key: phoneCountry, max: risk.countryHourlyCap, windowMs: hour }),
    },
    {
      message: 'Estamos com muitos pedidos de código agora. Tente novamente em alguns minutos.',
      run: () => consumeRateLimit({ scope: 'phone:verify-start:global', key: 'all', max: risk.globalHourlyCap, windowMs: hour }),
    },
  ];

  for (const limit of limits) {
    const result = await limit.run();
    if (!result.allowed) {
      const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
      console.warn('[phone-verification] pedido de código barrado por limite de taxa', { phoneCountry, ip });
      return NextResponse.json(
        { error: limit.message, retryAfterSeconds: retryAfter },
        { status: 429, headers: { ...buildRateLimitHeaders(result), 'Retry-After': String(retryAfter) } },
      );
    }
  }

  // Signal for the admin logs: the number's country differs from where the request came from.
  const accessCountry = getAccessCountry(request);
  if (accessCountry && phoneCountry !== 'XX' && accessCountry !== phoneCountry) {
    console.info('[phone-verification] país do número difere do país de acesso', { phoneCountry, accessCountry });
  }

  // Paid lookup, only after every limit passed: blocks VoIP/virtual numbers and numbers with high
  // SMS-pumping risk. If Twilio's lookup is unavailable the request goes on (limits still apply).
  if (!isBypassNumber(phoneE164)) {
    const assessment = await assessPhoneRisk(phoneE164);
    if (!assessment.allowed) {
      console.warn('[phone-verification] número recusado pela análise de risco', { reason: assessment.reason, phoneCountry });
      return NextResponse.json({ error: assessment.message }, { status: 400 });
    }
  }

  try {
    await sendPhoneVerificationCode({ userId, phoneE164, deviceIp: ip });
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
