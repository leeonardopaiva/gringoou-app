import { BusinessStatus, MarketplaceStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { regionWhereFor, resolveRegionScope } from '@/lib/region-scope';
import { getVisibilityFilter } from '@/lib/visibility';

export const runtime = 'nodejs';

const LIMIT = 4;

/** Busca para menções (@): pessoas, páginas de negócio e anúncios, sempre da região de quem busca. */
export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ results: [] }, { status: 401 });
  const query = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 40);
  const scope = resolveRegionScope(session, null);
  const region = regionWhereFor(scope);
  const contains = (value: string): Prisma.StringFilter => ({ contains: value, mode: Prisma.QueryMode.insensitive });

  const [people, businesses, items] = await Promise.all([
    prisma.user.findMany({
      where: { onboardingCompleted: true, username: { not: null }, ...region, ...(query ? { OR: [{ name: contains(query) }, { username: contains(query) }] } : {}) },
      take: LIMIT, orderBy: { name: 'asc' }, select: { name: true, username: true, image: true },
    }),
    prisma.business.findMany({
      where: { status: BusinessStatus.PUBLISHED, AND: [getVisibilityFilter(scope.regionKey)], ...(query ? { OR: [{ name: contains(query) }, { category: contains(query) }] } : {}) },
      take: LIMIT, orderBy: [{ ratingAverage: 'desc' }, { createdAt: 'desc' }], select: { id: true, slug: true, name: true, category: true, imageUrl: true },
    }),
    query
      ? prisma.marketplaceItem.findMany({
          where: { status: MarketplaceStatus.ACTIVE, ...region, title: contains(query) },
          take: LIMIT, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, imageUrl: true },
        })
      : Promise.resolve([]),
  ]);

  const results = [
    ...people.filter((person) => person.username).map((person) => ({ kind: 'user' as const, ref: person.username as string, label: person.name || (person.username as string), subtitle: `@${person.username}`, image: person.image })),
    ...businesses.map((business) => ({ kind: 'business' as const, ref: business.slug || business.id, label: business.name, subtitle: `Negócio · ${business.category}`, image: business.imageUrl })),
    ...items.map((item) => ({ kind: 'item' as const, ref: item.id, label: item.title.slice(0, 60), subtitle: 'Anúncio no marketplace', image: item.imageUrl })),
  ].filter((entry) => !/[\]\[()\n]/.test(entry.label));

  return NextResponse.json({ results });
}
