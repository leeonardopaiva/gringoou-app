import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import { guardPhoneCodeRequest, phoneSendErrorResponse } from '@/lib/phone-code-guard';
import {
  getPhoneBlockMessage,
  isPhoneVerificationConfigured,
  sendPhoneVerificationCode,
  toE164Phone,
} from '@/lib/phone-verification';
import { prisma } from '@/lib/prisma';
import { getRequestIp } from '@/lib/rate-limit';

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
  const userId = session.user.id;
  const [currentUser, numberOwner] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { phoneVerifiedAt: true } }),
    prisma.user.findFirst({
      where: { phone: phoneE164, phoneVerifiedAt: { not: null }, NOT: { id: userId } },
      select: { id: true },
    }),
  ]);

  if (currentUser?.phoneVerifiedAt) {
    return NextResponse.json({ error: 'Seu telefone já está confirmado.' }, { status: 409 });
  }

  if (numberOwner) {
    return NextResponse.json({ error: 'Este telefone já está vinculado a outra conta.' }, { status: 409 });
  }

  const refusal = await guardPhoneCodeRequest({ request, phoneE164, identity: userId });
  if (refusal) return refusal;

  try {
    await sendPhoneVerificationCode({ userId, phoneE164, deviceIp: getRequestIp(request) });
  } catch (error) {
    return phoneSendErrorResponse(error);
  }

  return NextResponse.json({
    ok: true,
    phone: phoneE164,
    message: 'Enviamos um código por SMS.',
  });
}
