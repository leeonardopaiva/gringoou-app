import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { validateUsernameValue } from '@/lib/username';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUsername = searchParams.get('username') || '';
  const session = await getServerAuthSession();
  const rateLimit = await consumeRateLimit({
    scope: 'username:check',
    key: getRateLimitKey(request, session?.user?.id),
    max: 40,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { available: false, reason: 'Muitas verificações em pouco tempo.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const validation = validateUsernameValue(rawUsername);

  if (validation.error) {
    return NextResponse.json({
      available: false,
      username: validation.normalized,
      reason: validation.error,
    });
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      username: validation.normalized,
      ...(session?.user?.id ? { NOT: { id: session.user.id } } : {}),
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return NextResponse.json({
      available: false,
      username: validation.normalized,
      reason: 'Esse nome já está em uso.',
    });
  }

  return NextResponse.json({
    available: true,
    username: validation.normalized,
  });
}
