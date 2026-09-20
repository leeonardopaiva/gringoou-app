import 'server-only';

import { EventStatus, Prisma, UserRole, VisibilityScope } from '@prisma/client';
import type { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { getVisibilityFilter } from '@/lib/visibility';
import type { EventItem } from '@/types';

export type EventsPage = { events: EventItem[]; scope: 'local' | 'global' };

export async function getEventsPage({ session, regionKey, category }: { session: Session | null; regionKey?: string | null; category?: string | null }): Promise<EventsPage> {
  const viewerId = session?.user?.id;
  const isAdmin = session?.user?.role === UserRole.ADMIN;
  const events = await prisma.event.findMany({
    where: {
      startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      ...(category ? { category } : {}),
      OR: [
        { status: EventStatus.PUBLISHED, ...getVisibilityFilter(regionKey) },
        ...(viewerId ? [{ status: EventStatus.PENDING_REVIEW, createdById: viewerId }] : []),
        ...(isAdmin ? [{ status: EventStatus.PENDING_REVIEW }] : []),
      ],
    },
    orderBy: [{ startsAt: 'asc' }],
    take: 24,
    select: {
      id: true, slug: true, title: true, description: true, venueName: true, category: true, startsAt: true,
      endsAt: true, locationLabel: true, regionKey: true, externalUrl: true, imageUrl: true,
      galleryUrls: true, ratingAverage: true, ratingCount: true, visibilityScope: true,
      status: true, createdById: true, businessId: true,
      favorites: {
        select: { userId: true, user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: 'desc' }, take: 6,
      },
      _count: { select: { favorites: true } },
    },
  });

  const editableIds = viewerId && events.length > 0
    ? new Set((await prisma.$queryRaw<Array<{ eventId: string }>>(Prisma.sql`
        SELECT e."id" AS "eventId"
        FROM "public"."Event" e
        INNER JOIN "public"."BusinessMember" bm ON bm."businessId" = e."businessId"
        WHERE e."id" IN (${Prisma.join(events.map((event) => event.id))})
          AND bm."userId" = ${viewerId}
      `)).map((row) => row.eventId))
    : new Set<string>();

  return {
    events: events.map(({ createdById, businessId, favorites, visibilityScope: _visibilityScope, _count, ...event }) => {
      const canEdit = isAdmin || createdById === viewerId || editableIds.has(event.id);
      const canViewInterestedUsers = isAdmin;
      return {
        ...event,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt?.toISOString() ?? null,
        isFavorite: Boolean(viewerId && favorites.some((favorite) => favorite.userId === viewerId)),
        interestCount: _count.favorites,
        interestPreview: canViewInterestedUsers
          ? favorites.map((favorite) => favorite.user).filter((user): user is { id: string; name: string | null; image: string | null } => Boolean(user))
          : favorites.map((favorite) => ({ id: favorite.userId, name: null, image: null })),
        canViewInterestedUsers,
        canUnlockInterestedUsers: !isAdmin && canEdit && Boolean(businessId),
        canEdit,
        isPendingReview: event.status === EventStatus.PENDING_REVIEW,
        publicPath: `/eventos/${event.slug || event.id}`,
      };
    }),
    scope: regionKey && events.some((event) => event.visibilityScope !== VisibilityScope.GLOBAL) ? 'local' : 'global',
  };
}
