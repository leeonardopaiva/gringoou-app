import { EventStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { refreshEventRating } from '@/lib/place-engagement';
import { prisma } from '@/lib/prisma';
import { starRatingSchema } from '@/lib/validators';
import { isVisibleForRegion } from '@/lib/visibility';
import { addMockEventRating, USE_MOCKS } from '@/lib/server/mocks';

type RouteContext = {
  params: Promise<{
    eventId: string;
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

  const { eventId } = await context.params;

  if (USE_MOCKS) {
    return NextResponse.json(addMockEventRating(eventId, parsed.data.stars));
  }

  const event = await prisma.event.findFirst({
    where: {
      OR: [{ id: eventId }, { slug: eventId }],
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

  if (!event) {
    return NextResponse.json({ error: 'Evento nao encontrado.' }, { status: 404 });
  }

  const isBusinessMember =
    (
      await prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT bm."id"
          FROM "public"."Event" e
          INNER JOIN "public"."BusinessMember" bm ON bm."businessId" = e."businessId"
          WHERE e."id" = ${event.id}
            AND bm."userId" = ${session.user.id}
          LIMIT 1
        `,
      )
    ).length > 0;

  const canView =
    (event.status === EventStatus.PUBLISHED &&
      isVisibleForRegion(
        {
          regionKey: event.regionKey,
          visibilityScope: event.visibilityScope,
          visibilityRegionKey: event.visibilityRegionKey,
        },
        session.user.regionKey,
    )) ||
    session.user.role === 'ADMIN' ||
    session.user.id === event.createdById ||
    isBusinessMember;

  if (!canView) {
    return NextResponse.json({ error: 'Evento indisponivel.' }, { status: 404 });
  }

  if (session.user.role === 'ADMIN' || session.user.id === event.createdById || isBusinessMember) {
    return NextResponse.json({ error: 'Voce nao pode avaliar o proprio evento.' }, { status: 403 });
  }

  const existingRating = await prisma.eventRating.findUnique({
    where: {
      eventId_userId: {
        eventId: event.id,
        userId: session.user.id,
      },
    },
    select: { stars: true },
  });

  if (existingRating) {
    return NextResponse.json(
      {
        error: 'Voce ja avaliou este evento.',
        viewerRating: existingRating.stars,
      },
      { status: 409 },
    );
  }

  const updatedEvent = await prisma.$transaction(async (tx) => {
    await tx.eventRating.create({
      data: {
        eventId: event.id,
        userId: session.user.id,
        stars: parsed.data.stars,
      },
    });

    return refreshEventRating(tx, event.id);
  });

  return NextResponse.json({
    viewerRating: parsed.data.stars,
    ratingAverage: updatedEvent.ratingAverage,
    ratingCount: updatedEvent.ratingCount,
  });
}
