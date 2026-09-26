import { EventStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isVisibleForRegion } from '@/lib/visibility';
import { setMockEventFavorite, USE_MOCKS } from '@/lib/server/mocks';

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

const loadEventForFavorite = async (eventId: string) =>
  prisma.event.findFirst({
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

export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { eventId } = await context.params;

  if (USE_MOCKS) {
    return NextResponse.json(setMockEventFavorite(eventId, true));
  }

  const event = await loadEventForFavorite(eventId);

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

  await prisma.eventFavorite.upsert({
    where: {
      eventId_userId: {
        eventId: event.id,
        userId: session.user.id,
      },
    },
    update: {},
    create: {
      eventId: event.id,
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

  const { eventId } = await context.params;

  if (USE_MOCKS) {
    return NextResponse.json(setMockEventFavorite(eventId, false));
  }

  const event = await loadEventForFavorite(eventId);

  if (!event) {
    return NextResponse.json({ error: 'Evento nao encontrado.' }, { status: 404 });
  }

  await prisma.eventFavorite.deleteMany({
    where: {
      eventId: event.id,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ isFavorite: false });
}
