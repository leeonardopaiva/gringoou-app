import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { findRegionByKey } from '@/lib/region-store';
import { canUseRegionCountry, REGION_COUNTRY_BLOCKED_MESSAGE } from '@/lib/region-country-access';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { updateRegionSchema } from '@/lib/validators';

export async function PUT(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    scope: 'profile:region',
    key: getRateLimitKey(request, session.user.id),
    max: 10,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas trocas de região em pouco tempo.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const body = await request.json();
  const parsed = updateRegionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid region data' },
      { status: 400 },
    );
  }

  const region = await findRegionByKey(parsed.data.regionKey, { activeOnly: true });

  if (!region) {
    return NextResponse.json({ error: 'Invalid region' }, { status: 400 });
  }

  if (!(await canUseRegionCountry({ userId: session.user.id, role: session.user.role, request, regionCountryCode: region.countryCode }))) {
    return NextResponse.json({ error: REGION_COUNTRY_BLOCKED_MESSAGE }, { status: 403 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      locationLabel: region.label,
      regionKey: region.key,
    },
    select: {
      id: true,
      locationLabel: true,
      regionKey: true,
    },
  });

  return NextResponse.json({ user });
}
