import { EventStatus, UserRole, VisibilityScope } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { findRegionByKey } from '@/lib/region-store';
import { slugify, uniqueSlug } from '@/lib/slug';
import { eventSchema } from '@/lib/validators';
import { getEventsPage } from '@/lib/server/events';

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  const { searchParams } = new URL(request.url);
  const viewerRegionKey = searchParams.get('region') ?? session?.user?.regionKey;
  return NextResponse.json(await getEventsPage({ session, regionKey: viewerRegionKey, category: searchParams.get('category') || undefined }));
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    scope: 'event:create',
    key: getRateLimitKey(request, session.user.id),
    max: 4,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Cadastros demais em pouco tempo. Aguarde antes de enviar outro evento.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  if (!session.user.onboardingCompleted) {
    return NextResponse.json(
      { error: 'Complete your profile before creating an event' },
      { status: 400 },
    );
  }

  const body = await request.json();
  const parsed = eventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid event data' },
      { status: 400 },
    );
  }

  const professionalBusiness = parsed.data.businessId
    ? await prisma.business.findFirst({
        where: {
          id: parsed.data.businessId,
          OR: [
            { createdById: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
        select: {
          id: true,
          regionKey: true,
          locationLabel: true,
        },
      })
    : null;

  if (parsed.data.businessId && !professionalBusiness) {
    return NextResponse.json(
      { error: 'Selecione um perfil profissional valido para cadastrar o evento.' },
      { status: 403 },
    );
  }

  const effectiveRegionKey = professionalBusiness?.regionKey ?? parsed.data.regionKey;
  const region = professionalBusiness
    ? null
    : await findRegionByKey(effectiveRegionKey, { activeOnly: true });

  if (!professionalBusiness && !region) {
    return NextResponse.json({ error: 'Selecione uma regiao valida.' }, { status: 400 });
  }

  const baseSlug = slugify(parsed.data.title);
  const slug =
    baseSlug &&
    !(await prisma.event.findUnique({
      where: { slug: baseSlug },
      select: { id: true },
    }))
      ? baseSlug
      : uniqueSlug(parsed.data.title);

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        title: parsed.data.title,
        slug,
        description: parsed.data.description,
        venueName: parsed.data.venueName,
        category: parsed.data.category,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
        locationLabel: professionalBusiness?.locationLabel ?? region!.label,
        regionKey: professionalBusiness?.regionKey ?? region!.key,
        externalUrl: parsed.data.externalUrl,
        imageUrl: parsed.data.imageUrl,
        galleryUrls: parsed.data.galleryUrls,
        visibilityScope: VisibilityScope.USER_REGION,
        status: EventStatus.PENDING_REVIEW,
        createdById: session.user.id,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
      },
    });

    if (professionalBusiness) {
      await tx.$executeRaw`
        UPDATE "public"."Event"
        SET "businessId" = ${professionalBusiness.id}
        WHERE "id" = ${created.id}
      `;
    }

    return created;
  });

  return NextResponse.json({
    event,
    message: 'Event submitted for review',
  });
}

