import { EventStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findRegionByKey } from '@/lib/region-store';
import { eventUpdateSchema } from '@/lib/validators';
import { isVisibleForRegion } from '@/lib/visibility';

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  const { eventId } = await context.params;

  const event = await prisma.event.findFirst({
    where: {
      OR: [{ id: eventId }, { slug: eventId }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      venueName: true,
      startsAt: true,
      endsAt: true,
      locationLabel: true,
      regionKey: true,
      visibilityScope: true,
      visibilityRegionKey: true,
      externalUrl: true,
      imageUrl: true,
      galleryUrls: true,
      ratingAverage: true,
      ratingCount: true,
      status: true,
      createdById: true,
      createdBy: {
        select: {
          name: true,
        },
      },
      favorites: {
        where: { userId: session?.user?.id || '__no-user__' },
        select: { id: true },
        take: 1,
      },
      ratings: {
        where: { userId: session?.user?.id || '__no-user__' },
        select: { stars: true },
        take: 1,
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: 'Evento nao encontrado.' }, { status: 404 });
  }

  const isBusinessMember = session?.user?.id
    ? (
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
      ).length > 0
    : false;
  const canView =
    (event.status === EventStatus.PUBLISHED &&
      isVisibleForRegion(
        {
          regionKey: event.regionKey,
          visibilityScope: event.visibilityScope,
          visibilityRegionKey: event.visibilityRegionKey,
        },
        session?.user?.regionKey,
    )) ||
    session?.user?.role === 'ADMIN' ||
    session?.user?.id === event.createdById ||
    isBusinessMember;

  if (!canView) {
    return NextResponse.json({ error: 'Evento nao disponivel.' }, { status: 404 });
  }

  const region = await findRegionByKey(event.regionKey);
  const canEdit = session?.user?.role === 'ADMIN' || session?.user?.id === event.createdById || isBusinessMember;
  const canRate =
    Boolean(session?.user?.id) &&
    session?.user?.role !== 'ADMIN' &&
    session?.user?.id !== event.createdById &&
    !isBusinessMember;

  return NextResponse.json({
    event: {
      ...event,
      favorites: undefined,
      ratings: undefined,
      city: region?.city ?? null,
      state: region?.state ?? null,
      canEdit,
      canRate,
      isFavorite: event.favorites.length > 0,
      viewerRating: event.ratings[0]?.stars ?? null,
      publicPath: `/eventos/${event.slug}`,
    },
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = eventUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados invalidos do evento.' },
      { status: 400 },
    );
  }

  const { eventId } = await context.params;
  const existingEvent = await prisma.event.findFirst({
    where: {
      OR: [{ id: eventId }, { slug: eventId }],
    },
    select: {
      id: true,
      slug: true,
      createdById: true,
    },
  });

  if (!existingEvent) {
    return NextResponse.json({ error: 'Evento nao encontrado.' }, { status: 404 });
  }

  const canEdit =
    session.user.role === 'ADMIN' ||
    session.user.id === existingEvent.createdById ||
    (
      await prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT bm."id"
          FROM "public"."Event" e
          INNER JOIN "public"."BusinessMember" bm ON bm."businessId" = e."businessId"
          WHERE e."id" = ${existingEvent.id}
            AND bm."userId" = ${session.user.id}
          LIMIT 1
        `,
      )
    ).length > 0;

  if (!canEdit) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const event = await prisma.event.update({
    where: { id: existingEvent.id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.venueName !== undefined ? { venueName: parsed.data.venueName } : {}),
      ...(parsed.data.startsAt !== undefined ? { startsAt: new Date(parsed.data.startsAt) } : {}),
      ...(parsed.data.endsAt !== undefined ? { endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null } : {}),
      ...(parsed.data.externalUrl !== undefined ? { externalUrl: parsed.data.externalUrl ?? null } : {}),
      ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl ?? null } : {}),
      ...(parsed.data.galleryUrls !== undefined ? { galleryUrls: parsed.data.galleryUrls } : {}),
    },
    select: {
      id: true,
      slug: true,
      imageUrl: true,
      galleryUrls: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ event });
}
