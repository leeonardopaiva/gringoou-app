import { NextRequest, NextResponse } from 'next/server';
import { AD_ACCOUNT_COOKIE } from '@/lib/ads/account';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ businessId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    const loginUrl = new URL('/ads/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const { businessId } = await context.params;
  const membership = await prisma.adAccountUser.findFirst({
    where: {
      userId: session.user.id,
      adAccount: { businessId },
    },
    select: { adAccountId: true },
  });

  if (!membership) {
    return NextResponse.redirect(new URL(`/ads/onboarding?businessId=${encodeURIComponent(businessId)}`, request.url));
  }

  const response = NextResponse.redirect(new URL('/ads/wizard', request.url));
  response.cookies.set(AD_ACCOUNT_COOKIE, membership.adAccountId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
