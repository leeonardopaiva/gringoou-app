import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  checkPhoneVerificationCode,
  getAccessCountry,
  getPhoneCountry,
  getPhoneBlockMessage,
  isPhoneVerificationConfigured,
  toE164Phone,
} from '@/lib/phone-verification';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey, getRequestIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const checkSchema = z.object({
  phone: z.string().trim().min(8, 'Informe um telefone valido').max(30),
  code: z.string().trim().regex(/^\d{4,8}$/, 'Digite o código recebido por SMS'),
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
  const parsed = checkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
      { status: 400 },
    );
  }

  const phoneE164 = toE164Phone(parsed.data.phone);

  if (!phoneE164) {
    return NextResponse.json({ error: 'Telefone inválido.' }, { status: 400 });
  }

  const blockMessage = getPhoneBlockMessage(phoneE164);
  if (blockMessage) {
    return NextResponse.json({ error: blockMessage }, { status: 403 });
  }

  // Limits guessing: a 6-digit code has 1M combinations, so attempts must be capped.
  const rateLimit = await consumeRateLimit({
    scope: 'phone:verify-check',
    key: getRateLimitKey(request, session.user.id),
    max: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  // The same number and the same network are capped too, so spreading guesses over several
  // accounts does not multiply the attempts.
  for (const extra of [
    { scope: 'phone:verify-check:number', key: phoneE164, max: 10 },
    { scope: 'phone:verify-check:ip', key: getRequestIp(request), max: 40 },
  ]) {
    const result = await consumeRateLimit({ ...extra, windowMs: 15 * 60 * 1000 });
    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
        { status: 429, headers: buildRateLimitHeaders(result) },
      );
    }
  }

  let approved = false;
  try {
    approved = await checkPhoneVerificationCode({
      userId: session.user.id,
      phoneE164,
      code: parsed.data.code,
    });
  } catch (error) {
    console.error('[phone-verification] falha ao conferir código', error);
    return NextResponse.json({ error: 'Não foi possível conferir o código agora. Tente novamente.' }, { status: 502 });
  }

  if (!approved) {
    return NextResponse.json(
      { error: 'Código inválido ou expirado. Solicite um novo código.' },
      { status: 400 },
    );
  }

  // One confirmed number belongs to one account, so the same phone cannot be used to create
  // several verified accounts. Check and save run in one serializable transaction, so two
  // accounts confirming the same number at the same moment cannot both win.
  let user: { phone: string | null; phoneVerifiedAt: Date | null } | null = null;
  try {
    user = await prisma.$transaction(
      async (tx) => {
        const alreadyUsed = await tx.user.findFirst({
          where: { phone: phoneE164, phoneVerifiedAt: { not: null }, NOT: { id: session.user.id } },
          select: { id: true },
        });
        if (alreadyUsed) return null;

        return tx.user.update({
          where: { id: session.user.id },
          data: {
            phone: phoneE164,
            phoneVerifiedAt: new Date(),
            phoneCountry: getPhoneCountry(phoneE164),
            accessCountry: getAccessCountry(request),
          },
          select: { phone: true, phoneVerifiedAt: true },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (error) {
    // P2034 is a serialization conflict: the other account got there first. Anything else is a real failure.
    if ((error as { code?: string })?.code !== 'P2034') {
      console.error('[phone-verification] falha ao salvar telefone confirmado', error);
      return NextResponse.json({ error: 'Não foi possível salvar o telefone agora. Tente novamente.' }, { status: 500 });
    }
  }

  if (!user) {
    return NextResponse.json(
      { error: 'Este telefone já está vinculado a outra conta.' },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    phone: user.phone,
    phoneVerifiedAt: user.phoneVerifiedAt,
    message: 'Telefone confirmado com sucesso.',
  });
}
