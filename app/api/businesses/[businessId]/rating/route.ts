import { BusinessStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { refreshBusinessRating } from '@/lib/place-engagement';
import { prisma } from '@/lib/prisma';
import { starRatingSchema } from '@/lib/validators';
import { isVisibleForRegion } from '@/lib/visibility';
import { addMockBusinessRating, USE_MOCKS } from '@/lib/server/mocks';

type RouteContext = {
  params: Promise<{
    businessId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = starRatingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Avaliacao invalida.' },
      { status: 400 },
    );
  }

  const { businessId } = await context.params;

  if (USE_MOCKS) {
    return NextResponse.json(addMockBusinessRating(businessId, parsed.data.stars));
  }

  const business = await prisma.business.findFirst({
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
      members: {
        where: { userId: session.user.id },
        select: { id: true },
        take: 1,
      },
    },
  });

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

  if (session.user.role === 'ADMIN' || session.user.id === business.createdById || business.members.length > 0) {
    return NextResponse.json({ error: 'Voce nao pode avaliar o proprio negocio.' }, { status: 403 });
  }

  const existingRating = await prisma.businessRating.findUnique({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: session.user.id,
      },
    },
    select: { stars: true },
  });

  if (existingRating) {
    return NextResponse.json(
      {
        error: 'Voce ja avaliou este negocio.',
        viewerRating: existingRating.stars,
      },
      { status: 409 },
    );
  }

  const updatedBusiness = await prisma.$transaction(async (tx) => {
    await tx.businessRating.create({
      data: {
        businessId: business.id,
        userId: session.user.id,
        stars: parsed.data.stars,
      },
    });

    return refreshBusinessRating(tx, business.id);
  });

  return NextResponse.json({
    viewerRating: parsed.data.stars,
    ratingAverage: updatedBusiness.ratingAverage,
    ratingCount: updatedBusiness.ratingCount,
  });
}
