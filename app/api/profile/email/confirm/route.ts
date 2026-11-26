import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getAppBaseUrl } from '@/lib/app-url';
import { canSelfServeEmailChange, hashEmailChangeToken, normalizeEmail } from '@/lib/email-change';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const redirectWithStatus = (request: Request, status: string) =>
  NextResponse.redirect(new URL(`/profile?emailChange=${status}`, getAppBaseUrl(request)));

export async function GET(request: Request) {
  const rateLimit = await consumeRateLimit({
    scope: 'profile:email-confirm',
    key: getRateLimitKey(request),
    max: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde um instante e tente novamente.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const { searchParams } = new URL(request.url);
  const rawToken = searchParams.get('token');

  if (!rawToken) {
    return redirectWithStatus(request, 'invalid');
  }

  const tokenHash = hashEmailChangeToken(rawToken);
  const emailChangeToken = await prisma.emailChangeToken.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: {
        select: {
          id: true,
          role: true,
        },
      },
    },
  });

  if (!emailChangeToken) {
    return redirectWithStatus(request, 'invalid');
  }

  if (emailChangeToken.expiresAt.getTime() <= Date.now()) {
    await prisma.emailChangeToken.delete({
      where: {
        tokenHash,
      },
    });

    return redirectWithStatus(request, 'expired');
  }

  if (!canSelfServeEmailChange(emailChangeToken.newEmail, emailChangeToken.user.role === UserRole.ADMIN)) {
    await prisma.emailChangeToken.delete({
      where: {
        tokenHash,
      },
    });

    return redirectWithStatus(request, 'blocked');
  }

  const normalizedNewEmail = normalizeEmail(emailChangeToken.newEmail);
  const existingUser = await prisma.user.findFirst({
    where: {
      email: normalizedNewEmail,
      NOT: {
        id: emailChangeToken.userId,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    await prisma.emailChangeToken.delete({
      where: {
        tokenHash,
      },
    });

    return redirectWithStatus(request, 'taken');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: emailChangeToken.userId,
      },
      data: {
        email: normalizedNewEmail,
        emailVerified: new Date(),
      },
    }),
    prisma.emailChangeToken.deleteMany({
      where: {
        userId: emailChangeToken.userId,
      },
    }),
  ]);

  return redirectWithStatus(request, 'success');
}
