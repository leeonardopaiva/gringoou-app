import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isRequestGeoBlocked } from '@/lib/geo-access';
import { createPhoneProof } from '@/lib/phone-proof';
import {
  checkAnonymousVerificationCode,
  getPhoneBlockMessage,
  isPhoneVerificationConfigured,
  toE164Phone,
} from '@/lib/phone-verification';
import { buildRateLimitHeaders, consumeRateLimit, getRequestIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const checkSchema = z.object({
  phone: z.string().trim().min(8, 'Informe um telefone valido').max(30),
  code: z.string().trim().regex(/^\d{4,8}$/, 'Digite o código recebido por SMS'),
  challenge: z.string().max(2000).optional().nullable(),
});

/**
 * Segundo passo do cadastro: confere o código e, se aprovado, devolve uma PROVA assinada de que o
 * telefone foi confirmado. O cadastro exige essa prova; o navegador não consegue fabricá-la.
 */
export async function POST(request: Request) {
  if (await isRequestGeoBlocked(request)) {
    return NextResponse.json({ error: 'Gringoou ainda não está disponível na sua região.' }, { status: 403 });
  }

  if (!isPhoneVerificationConfigured) {
    return NextResponse.json({ error: 'A verificação por telefone ainda não está disponível.' }, { status: 503 });
  }

  const parsed = checkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const phoneE164 = toE164Phone(parsed.data.phone);
  if (!phoneE164) {
    return NextResponse.json({ error: 'Telefone inválido.' }, { status: 400 });
  }

  const blockMessage = getPhoneBlockMessage(phoneE164);
  if (blockMessage) {
    return NextResponse.json({ error: blockMessage }, { status: 403 });
  }

  // A 6-digit code has 1M combinations, so guesses are capped per network and per number.
  for (const limit of [
    { scope: 'auth:phone-check:ip', key: getRequestIp(request), max: 30 },
    { scope: 'auth:phone-check:number', key: phoneE164, max: 10 },
  ]) {
    const result = await consumeRateLimit({ ...limit, windowMs: 15 * 60 * 1000 });
    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
        { status: 429, headers: buildRateLimitHeaders(result) },
      );
    }
  }

  let approved = false;
  try {
    approved = await checkAnonymousVerificationCode({ phoneE164, code: parsed.data.code, challenge: parsed.data.challenge });
  } catch (error) {
    console.error('[phone-verification] falha ao conferir código (cadastro)', error);
    return NextResponse.json({ error: 'Não foi possível conferir o código agora. Tente novamente.' }, { status: 502 });
  }

  if (!approved) {
    return NextResponse.json({ error: 'Código inválido ou expirado. Solicite um novo código.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, phone: phoneE164, phoneToken: createPhoneProof(phoneE164) });
}
