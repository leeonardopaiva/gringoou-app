import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  checkPhoneVerificationCode,
  getAccessCountry,
  getPhoneCountry,
  isPhoneBlocked,
  isPhoneVerificationConfigured,
  toE164Phone,
} from '@/lib/phone-verification';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const checkSchema = z.object({
  phone: z.string().trim().min(8, 'Informe um telefone valido').max(30),
  code: z.string().trim().regex(/^\d{4,8}$/, 'Digite o codigo recebido por SMS'),
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
  const parsed = checkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' },
      { status: 400 },
    );
  }

  const phoneE164 = toE164Phone(parsed.data.phone);

  if (!phoneE164) {
    return NextResponse.json({ error: 'Telefone invalido.' }, { status: 400 });
  }

  if (isPhoneBlocked(phoneE164)) {
    return NextResponse.json(
      { error: 'Este numero nao esta disponivel nesta fase de acesso.' },
      { status: 403 },
    );
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

  const approved = await checkPhoneVerificationCode({
    userId: session.user.id,
    phoneE164,
    code: parsed.data.code,
  });

  if (!approved) {
    return NextResponse.json(
      { error: 'Codigo invalido ou expirado. Solicite um novo codigo.' },
      { status: 400 },
    );
  }

  // One confirmed number belongs to one account, so the same phone cannot be
  // used to create several verified accounts.
  const alreadyUsed = await prisma.user.findFirst({
    where: {
      phone: phoneE164,
      phoneVerifiedAt: { not: null },
      NOT: { id: session.user.id },
    },
    select: { id: true },
  });

  if (alreadyUsed) {
    return NextResponse.json(
      { error: 'Este telefone ja esta vinculado a outra conta.' },
      { status: 409 },
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      phone: phoneE164,
      phoneVerifiedAt: new Date(),
      phoneCountry: getPhoneCountry(phoneE164),
      accessCountry: getAccessCountry(request),
    },
    select: { phone: true, phoneVerifiedAt: true },
  });

  return NextResponse.json({
    ok: true,
    phone: user.phone,
    phoneVerifiedAt: user.phoneVerifiedAt,
    message: 'Telefone confirmado com sucesso.',
  });
}
