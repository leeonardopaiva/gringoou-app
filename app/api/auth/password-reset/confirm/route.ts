import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPasswordValidationIssues } from '@/lib/forms/password';
import { hashPassword } from '@/lib/password-auth';
import { hashPasswordResetToken } from '@/lib/password-reset';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';

const schema = z.object({ token: z.string().min(32), password: z.string().min(8) });

export async function POST(request: Request) {
  const rateLimit = await consumeRateLimit({ scope: 'auth:password-reset-confirm', key: getRateLimitKey(request), max: 8, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429, headers: buildRateLimitHeaders(rateLimit) });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Link ou senha inválidos.' }, { status: 400 });
  const issues = getPasswordValidationIssues(parsed.data.password);
  if (issues.length) return NextResponse.json({ error: issues[0] }, { status: 400 });
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashPasswordResetToken(parsed.data.token) }, select: { id: true, userId: true, expiresAt: true } });
  if (!resetToken || resetToken.expiresAt <= new Date()) {
    if (resetToken) await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
    return NextResponse.json({ error: 'Este link expirou ou já foi utilizado.' }, { status: 400 });
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash: await hashPassword(parsed.data.password) } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } }),
  ]);
  return NextResponse.json({ message: 'Senha redefinida. Você já pode entrar com a nova senha.' });
}
