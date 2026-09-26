import { BusinessStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isVisibleForRegion } from '@/lib/visibility';
import { setMockBusinessFavorite, USE_MOCKS } from '@/lib/server/mocks';

type RouteContext = {
  params: Promise<{
    businessId: string;
  }>;
};

const loadBusinessForFavorite = async (businessId: string) =>
  prisma.business.findFirst({
    where: {
      OR: [{ id: businessId }, { slug: businessId }],
    },
    select: {
      id: true,
      createdById: true,
      regionKey: true,
      visibilityScope: true,
      visibilityRegionKey: true,
      status: true,
    },
  });

export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { businessId } = await context.params;

  if (USE_MOCKS) {
    return NextResponse.json(setMockBusinessFavorite(businessId, true));
  }

  const business = await loadBusinessForFavorite(businessId);

  if (!business) {
    return NextResponse.json({ error: 'Negocio nao encontrado.' }, { status: 404 });
  }

  const canView =
    (business.status === BusinessStatus.PUBLISHED &&
      isVisibleForRegion(
        {
          regionKey: business.regionKey,
          visibilityScope: business.visibilityScope,
          visibilityRegionKey: business.visibilityRegionKey,
        },
        session.user.regionKey,
      )) ||
    session.user.role === 'ADMIN' ||
    session.user.id === business.createdById;

  if (!canView) {
    return NextResponse.json({ error: 'Negocio indisponivel.' }, { status: 404 });
  }

  await prisma.businessFavorite.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: session.user.id,
      },
    },
    update: {},
    create: {
      businessId: business.id,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ isFavorite: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { businessId } = await context.params;

  if (USE_MOCKS) {
    return NextResponse.json(setMockBusinessFavorite(businessId, false));
  }

  const business = await loadBusinessForFavorite(businessId);

  if (!business) {
    return NextResponse.json({ error: 'Negocio nao encontrado.' }, { status: 404 });
  }

  await prisma.businessFavorite.deleteMany({
    where: {
      businessId: business.id,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ isFavorite: false });
}
