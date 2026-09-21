import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendPasswordResetEmail } from '@/lib/email-auth';
import { normalizeAuthEmail } from '@/lib/password-auth';
import { createPasswordResetToken, hashPasswordResetToken, PASSWORD_RESET_MAX_AGE_MS } from '@/lib/password-reset';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';

const schema = z.object({ email: z.string().trim().email() });
const genericMessage = 'Se existir uma conta com senha para este e-mail, enviaremos as instruções de recuperação.';

export async function POST(request: Request) {
  const rateLimit = await consumeRateLimit({ scope: 'auth:password-reset-request', key: getRateLimitKey(request), max: 5, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429, headers: buildRateLimitHeaders(rateLimit) });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
  const email = normalizeAuthEmail(parsed.data.email);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, passwordHash: true } });
  if (!user?.email || !user.passwordHash) return NextResponse.json({ message: genericMessage });

  const token = createPasswordResetToken();
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashPasswordResetToken(token), expiresAt: new Date(Date.now() + PASSWORD_RESET_MAX_AGE_MS) } }),
  ]);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
  const url = `${appUrl}/login?resetToken=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  await sendPasswordResetEmail(email, url);
  return NextResponse.json({ message: genericMessage });
}
