import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findRegionByKey } from '@/lib/region-store';
import { requireAdminSession } from '@/lib/require-admin';
import { adminEventSchema } from '@/lib/validators';

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { response } = await requireAdminSession();

  if (response) {
    return response;
  }

  const body = await request.json();
  const parsed = adminEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos do evento.' },
      { status: 400 },
    );
  }

  const region = await findRegionByKey(parsed.data.regionKey);
  const visibilityRegion =
    parsed.data.visibilityScope === 'SPECIFIC_REGION' && parsed.data.visibilityRegionKey
      ? await findRegionByKey(parsed.data.visibilityRegionKey)
      : null;

  if (!region) {
    return NextResponse.json({ error: 'Região inválida.' }, { status: 400 });
  }

  if (parsed.data.visibilityScope === 'SPECIFIC_REGION' && !visibilityRegion) {
    return NextResponse.json({ error: 'Região de visibilidade inválida.' }, { status: 400 });
  }

  const { eventId } = await context.params;

  try {
    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        venueName: parsed.data.venueName,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
        visibilityScope: parsed.data.visibilityScope,
        visibilityRegionKey:
          parsed.data.visibilityScope === 'SPECIFIC_REGION'
            ? parsed.data.visibilityRegionKey || null
            : null,
        locationLabel: region.label,
        regionKey: region.key,
        externalUrl: parsed.data.externalUrl,
        imageUrl: parsed.data.imageUrl,
        galleryUrls: parsed.data.galleryUrls,
        status: parsed.data.status,
      },
      select: {
        id: true,
        title: true,
        slug: true,
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
        status: true,
        createdAt: true,
        updatedAt: true,
        visibilityRegion: {
          select: {
            key: true,
            label: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });
    }

    throw error;
  }
}
