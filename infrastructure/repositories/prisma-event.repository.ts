import 'server-only';

import { EventStatus, Prisma, UserRole, VisibilityScope } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { EventRepository, EventListFilters } from '@/domain/events/repositories/event.repository';
import type { EventListItem, EventDetailItem, EventsPage } from '@/domain/events/entities/event.entity';
import { getVisibilityFilter } from '@/lib/visibility';
import { findRegionByKey } from '@/lib/region-store';

function buildListQuery(filters: EventListFilters) {
  const { viewerId, isAdmin, regionKey, category } = filters;

  return {
    where: {
      startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      ...(category ? { category } : {}),
      OR: [
        { status: EventStatus.PUBLISHED, ...getVisibilityFilter(regionKey) },
        ...(viewerId ? [{ status: EventStatus.PENDING_REVIEW, createdById: viewerId }] : []),
        ...(isAdmin ? [{ status: EventStatus.PENDING_REVIEW }] : []),
      ],
    },
    orderBy: [{ startsAt: 'asc' as const }],
    take: 24,
    select: {
      id: true, slug: true, title: true, description: true, venueName: true, category: true, startsAt: true,
      endsAt: true, locationLabel: true, regionKey: true, externalUrl: true, imageUrl: true,
      galleryUrls: true, ratingAverage: true, ratingCount: true, visibilityScope: true,
      status: true, createdById: true, businessId: true,
      favorites: {
        select: { userId: true, user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: 'desc' as const }, take: 6,
      },
      _count: { select: { favorites: true } },
    },
  };
}

async function resolveEditableIds(
  prisma: PrismaClient,
  eventIds: string[],
  viewerId: string,
): Promise<Set<string>> {
  if (eventIds.length === 0) return new Set<string>();

  const rows = await prisma.$queryRaw<Array<{ eventId: string }>>(Prisma.sql`
    SELECT e."id" AS "eventId"
    FROM "public"."Event" e
    INNER JOIN "public"."BusinessMember" bm ON bm."businessId" = e."businessId"
    WHERE e."id" IN (${Prisma.join(eventIds)})
      AND bm."userId" = ${viewerId}
  `);

  return new Set(rows.map((row) => row.eventId));
}

function mapEventListItem(
  raw: {
    id: string; slug: string; title: string; description: string; venueName: string;
    category: string; startsAt: Date; endsAt: Date | null; locationLabel: string;
    regionKey: string; externalUrl: string | null; imageUrl: string | null;
    galleryUrls: string[]; ratingAverage: number; ratingCount: number;
    visibilityScope: string; status: string; createdById: string; businessId: string | null;
    favorites: Array<{ userId: string; user: { id: string; name: string | null; image: string | null } | null }>;
    _count: { favorites: number };
  },
  viewerId: string | null,
  isAdmin: boolean,
  editableIds: Set<string>,
): EventListItem {
  const canEdit = isAdmin || raw.createdById === viewerId || editableIds.has(raw.id);
  const canViewInterestedUsers = isAdmin;

  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.description,
    venueName: raw.venueName,
    category: raw.category,
    startsAt: raw.startsAt.toISOString(),
    endsAt: raw.endsAt?.toISOString() ?? null,
    locationLabel: raw.locationLabel,
    regionKey: raw.regionKey,
    externalUrl: raw.externalUrl ?? null,
    imageUrl: raw.imageUrl ?? null,
    galleryUrls: raw.galleryUrls,
    ratingAverage: raw.ratingAverage,
    ratingCount: raw.ratingCount,
    status: raw.status,
    isFavorite: Boolean(viewerId && raw.favorites.some((f) => f.userId === viewerId)),
    canEdit,
    isPendingReview: raw.status === EventStatus.PENDING_REVIEW,
    publicPath: `/eventos/${raw.slug || raw.id}`,
    interestCount: raw._count.favorites,
    interestPreview: canViewInterestedUsers
      ? raw.favorites.map((f) => f.user).filter((u): u is { id: string; name: string | null; image: string | null } => Boolean(u))
      : raw.favorites.map((f) => ({ id: f.userId, name: null, image: null })),
    canViewInterestedUsers,
    canUnlockInterestedUsers: !isAdmin && canEdit && Boolean(raw.businessId),
  };
}

function determineScope(
  regionKey: string | null | undefined,
  events: Array<{ visibilityScope: string }>,
): 'local' | 'global' {
  return regionKey && events.some((e) => e.visibilityScope !== VisibilityScope.GLOBAL)
    ? 'local'
    : 'global';
}

export function makePrismaEventRepository(prisma: PrismaClient): EventRepository {
  return {
    async list(filters: EventListFilters): Promise<EventsPage> {
      const { viewerId, isAdmin, regionKey } = filters;

      const query = buildListQuery(filters);
      const events = await prisma.event.findMany(query);

      const editableIds = viewerId && events.length > 0
        ? await resolveEditableIds(prisma, events.map((e) => e.id), viewerId)
        : new Set<string>();

      return {
        events: events.map((raw) => mapEventListItem(raw, viewerId, isAdmin, editableIds)),
        scope: determineScope(regionKey, events),
      };
    },

    async getByIdOrSlug(
      idOrSlug: string,
      viewerId: string | null,
      isAdmin: boolean,
    ): Promise<EventDetailItem | null> {
      const event = await prisma.event.findFirst({
        where: {
          OR: [{ id: idOrSlug }, { slug: idOrSlug }],
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
          ratingAverage: true,
          ratingCount: true,
          status: true,
          ownershipVerifiedAt: true,
          createdById: true,
          businessId: true,
          createdBy: { select: { id: true, name: true } },
          favorites: {
            where: viewerId ? { userId: viewerId } : undefined,
            select: { userId: true },
            take: 1,
          },
          ratings: {
            where: viewerId ? { userId: viewerId } : undefined,
            select: { stars: true },
            take: 1,
          },
        },
      });

      if (!event) return null;

      const isOwner = event.createdById === viewerId;
      const isBusinessMember = event.businessId && viewerId
        ? await prisma.businessMember.findFirst({
            where: { businessId: event.businessId, userId: viewerId },
            select: { id: true },
          }).then((r) => r !== null)
        : false;
      const canEdit = isAdmin || isOwner || isBusinessMember;

      const canRate = Boolean(viewerId) && !isAdmin && !isOwner && !isBusinessMember;

      if (event.status !== EventStatus.PUBLISHED && !(event.status === EventStatus.PENDING_REVIEW && (isOwner || isAdmin))) {
        return null;
      }

      const region = await findRegionByKey(event.regionKey);

      return {
        id: event.id,
        slug: event.slug,
        title: event.title,
        category: event.category,
        description: event.description,
        venueName: event.venueName,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt?.toISOString() ?? null,
        locationLabel: event.locationLabel,
        regionKey: event.regionKey,
        city: region?.city ?? null,
        state: region?.state ?? null,
        externalUrl: event.externalUrl ?? '',
        imageUrl: event.imageUrl ?? '',
        galleryUrls: event.galleryUrls,
        ratingAverage: event.ratingAverage,
        ratingCount: event.ratingCount,
        viewerRating: event.ratings?.[0]?.stars ?? null,
        isFavorite: event.favorites.length > 0,
        canEdit,
        canRate,
        createdByName: event.createdBy?.name ?? 'Comunidade Gringoou',
        publicPath: `/eventos/${event.slug || event.id}`,
        status: event.status,
        ownershipVerifiedAt: event.ownershipVerifiedAt?.toISOString() ?? null,
        businessId: event.businessId,
      };
    },
  };
}