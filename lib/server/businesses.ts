import 'server-only';

import { BusinessStatus, Prisma, UserRole, VisibilityScope } from '@prisma/client';
import type { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { getVisibilityFilter } from '@/lib/visibility';
import type { Business } from '@/types';
import { getMockBusinessesPage, USE_MOCKS } from '@/lib/server/mocks';

export type BusinessesPage = { businesses: Business[]; scope: 'local' | 'global' };

export async function getBusinessesPage({
  session,
  regionKey,
  category,
  search,
}: {
  session: Session | null;
  regionKey?: string | null;
  category?: string | null;
  search?: string | null;
}): Promise<BusinessesPage> {
  if (USE_MOCKS) {
    return getMockBusinessesPage();
  }

  const viewerId = session?.user?.id;
  const isAdmin = session?.user?.role === UserRole.ADMIN;
  const where: Prisma.BusinessWhereInput = {
    AND: [
      category ? { category } : {},
      search
        ? { OR: [
            { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { category: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { address: { contains: search, mode: Prisma.QueryMode.insensitive } },
          ] }
        : {},
      { OR: [
          { status: BusinessStatus.PUBLISHED, ...getVisibilityFilter(regionKey) },
          ...(viewerId ? [{ status: BusinessStatus.PENDING_REVIEW, createdById: viewerId }] : []),
          ...(isAdmin ? [{ status: BusinessStatus.PENDING_REVIEW }] : []),
        ] },
    ],
  };

  const businesses = await prisma.business.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    take: 24,
    select: {
      id: true, slug: true, name: true, category: true, address: true, imageUrl: true,
      locationLabel: true, ratingAverage: true, ratingCount: true, visibilityScope: true,
      status: true, createdById: true,
      members: { where: { userId: viewerId || '__no-user__' }, select: { id: true }, take: 1 },
      favorites: { where: { userId: viewerId || '__no-user__' }, select: { id: true }, take: 1 },
    },
  });

  return {
    businesses: businesses.map(({ createdById, favorites, members, visibilityScope: _visibilityScope, ...business }) => ({
      ...business,
      isFavorite: favorites.length > 0,
      canEdit: isAdmin || createdById === viewerId || members.length > 0,
      isPendingReview: business.status === BusinessStatus.PENDING_REVIEW,
      publicPath: `/negocios/${business.slug || business.id}`,
    })),
    scope: regionKey && businesses.some((business) => business.visibilityScope !== VisibilityScope.GLOBAL) ? 'local' : 'global',
  };
}
