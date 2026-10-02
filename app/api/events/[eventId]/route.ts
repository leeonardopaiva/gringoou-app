import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findRegionByKey } from '@/lib/region-store';
import { eventUpdateSchema } from '@/lib/validators';
import { eventsUseCases } from '@/lib/server/events-usecases';
import { getMockEventDetail, USE_MOCKS } from '@/lib/server/mocks';

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { eventId } = await context.params;

  if (USE_MOCKS) {
    return NextResponse.json(getMockEventDetail(eventId));
  }

  const session = await getServerAuthSession();
  const viewerId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === 'ADMIN';

  const event = await eventsUseCases.getEvent({
    idOrSlug: eventId,
    viewerId,
    isAdmin,
  });

  if (!event) {
    return NextResponse.json({ error: 'Evento nao encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ event });
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
      regionKey: true,
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

  const region = parsed.data.regionKey
    ? await findRegionByKey(parsed.data.regionKey, { activeOnly: true })
    : null;
  if (parsed.data.regionKey && !region) {
    return NextResponse.json({ error: 'Selecione uma regiao valida.' }, { status: 400 });
  }

  const event = await prisma.event.update({
    where: { id: existingEvent.id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.venueName !== undefined ? { venueName: parsed.data.venueName } : {}),
      ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
      ...(parsed.data.startsAt !== undefined ? { startsAt: new Date(parsed.data.startsAt) } : {}),
      ...(parsed.data.endsAt !== undefined ? { endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null } : {}),
      ...(parsed.data.externalUrl !== undefined ? { externalUrl: parsed.data.externalUrl ?? null } : {}),
      ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl ?? null } : {}),
      ...(parsed.data.galleryUrls !== undefined ? { galleryUrls: parsed.data.galleryUrls } : {}),
      ...(region ? { regionKey: region.key, locationLabel: region.label } : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      venueName: true,
      category: true,
      startsAt: true,
      endsAt: true,
      locationLabel: true,
      regionKey: true,
      externalUrl: true,
      imageUrl: true,
      galleryUrls: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ event });
}
