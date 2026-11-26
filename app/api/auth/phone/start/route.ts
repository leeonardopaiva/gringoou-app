import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isRequestGeoBlocked } from '@/lib/geo-access';
import { isOperationalFeatureEnabled } from '@/lib/operational-flags';
import { guardPhoneCodeRequest, phoneSendErrorResponse } from '@/lib/phone-code-guard';
import {
  getPhoneBlockMessage,
  isPhoneVerificationConfigured,
  sendAnonymousVerificationCode,
  toE164Phone,
} from '@/lib/phone-verification';
import { prisma } from '@/lib/prisma';
import { consumeRateLimit, getRequestIp } from '@/lib/rate-limit';
import { verifySimpleCaptcha } from '@/lib/simple-captcha';

export const runtime = 'nodejs';

const startSchema = z.object({
  phone: z.string().trim().min(8, 'Informe um telefone valido').max(30),
  captchaToken: z.string().min(10),
  captchaAnswer: z.string().trim().min(1, 'Resolva o calculo de verificação.'),
});

/**
 * Primeiro passo do cadastro: pede o código de SMS ANTES de existir conta. Como não há login,
 * a proteção vem do captcha (de uso único), dos limites por IP/número/país e da análise de risco.
 */
export async function POST(request: Request) {
  if (!isOperationalFeatureEnabled('registration')) {
    return NextResponse.json({ error: 'Novos cadastros estão temporariamente pausados.' }, { status: 503, headers: { 'Retry-After': '300' } });
  }

  if (await isRequestGeoBlocked(request)) {
    return NextResponse.json({ error: 'Gringoou ainda não está disponível na sua região.' }, { status: 403 });
  }

  if (!isPhoneVerificationConfigured) {
    return NextResponse.json({ error: 'A verificação por telefone ainda não está disponível.' }, { status: 503 });
  }

  const parsed = startSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Telefone inválido.' }, { status: 400 });
  }

  const phoneE164 = toE164Phone(parsed.data.phone);
  if (!phoneE164) {
    return NextResponse.json({ error: 'Use o telefone com o código do país, por exemplo +1 305 000 0000.' }, { status: 400 });
  }

  const blockMessage = getPhoneBlockMessage(phoneE164);
  if (blockMessage) {
    return NextResponse.json({ error: blockMessage }, { status: 403 });
  }

  if (!verifySimpleCaptcha(parsed.data.captchaToken, parsed.data.captchaAnswer)) {
    return NextResponse.json({ error: 'Verificação incorreta ou expirada. Resolva a nova conta mostrada e tente novamente.' }, { status: 400 });
  }

  // The captcha is stateless, so each solved challenge is accepted once only (otherwise one
  // solved answer could be replayed to request codes in bulk).
  const signature = parsed.data.captchaToken.split('.')[1] ?? parsed.data.captchaToken;
  const replay = await consumeRateLimit({ scope: 'auth:captcha-used', key: signature, max: 1, windowMs: 15 * 60 * 1000 });
  if (!replay.allowed) {
    return NextResponse.json({ error: 'Verificação incorreta ou expirada. Resolva a nova conta mostrada e tente novamente.' }, { status: 400 });
  }

  // Free check before any SMS: the number already belongs to a confirmed account.
  const numberOwner = await prisma.user.findFirst({
    where: { phone: phoneE164, phoneVerifiedAt: { not: null } },
    select: { id: true },
  });
  if (numberOwner) {
    return NextResponse.json({ error: 'Este telefone já está vinculado a uma conta. Entre com ela.' }, { status: 409 });
  }

  const ip = getRequestIp(request);
  const refusal = await guardPhoneCodeRequest({ request, phoneE164, identity: `anon:${ip}`, perIdentityHourly: 8 });
  if (refusal) return refusal;

  try {
    const { challenge } = await sendAnonymousVerificationCode({ phoneE164, deviceIp: ip });
    return NextResponse.json({ ok: true, phone: phoneE164, challenge: challenge ?? null, message: 'Enviamos um código por SMS.' });
  } catch (error) {
    return phoneSendErrorResponse(error);
  }
}
