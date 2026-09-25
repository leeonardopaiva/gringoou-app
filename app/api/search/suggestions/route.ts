import { BusinessStatus, CommunityPostStatus, EventStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const LIMIT = 5;

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim().slice(0, 60);
  const regionKey = session?.user?.regionKey || undefined;
  if (query && query.length < 2) return NextResponse.json({ suggestions: [] });

  const contains = (value: string): Prisma.StringFilter => ({ contains: value, mode: Prisma.QueryMode.insensitive });
  const [regions, events, businesses, groups, people, posts] = await Promise.all([
    prisma.region.findMany({ where: query ? { isActive: true, OR: [{ label: contains(query) }, { city: contains(query) }, { state: contains(query) }, { key: contains(query) }] } : { isActive: true, ...(regionKey ? { key: regionKey } : {}) }, take: LIMIT, orderBy: { label: 'asc' }, select: { key: true, label: true } }),
    prisma.event.findMany({ where: { status: EventStatus.PUBLISHED, startsAt: { gte: new Date() }, ...(regionKey ? { regionKey } : {}), ...(query ? { OR: [{ title: contains(query) }, { locationLabel: contains(query) }, { venueName: contains(query) }] } : {}) }, take: LIMIT, orderBy: { startsAt: 'asc' }, select: { id: true, slug: true, title: true, locationLabel: true } }),
    query ? prisma.business.findMany({ where: { status: BusinessStatus.PUBLISHED, OR: [{ name: contains(query) }, { slug: contains(query) }, { category: contains(query) }] }, take: LIMIT, orderBy: [{ ratingAverage: 'desc' }, { createdAt: 'desc' }], select: { id: true, slug: true, name: true, category: true } }) : Promise.resolve([]),
    query ? prisma.communityGroup.findMany({ where: { isPublic: true, OR: [{ name: contains(query) }, { slug: contains(query) }, { category: contains(query) }] }, take: LIMIT, orderBy: { createdAt: 'desc' }, select: { id: true, slug: true, name: true, category: true } }) : Promise.resolve([]),
    query ? prisma.user.findMany({ where: { onboardingCompleted: true, username: { not: null }, OR: [{ name: contains(query) }, { username: contains(query) }] }, take: LIMIT, orderBy: { name: 'asc' }, select: { id: true, username: true, name: true, locationLabel: true } }) : Promise.resolve([]),
    query ? prisma.communityPost.findMany({ where: { status: CommunityPostStatus.PUBLISHED, groupId: null, content: contains(query), ...(regionKey ? { regionKey } : {}) }, take: LIMIT, orderBy: { createdAt: 'desc' }, select: { id: true, content: true, locationLabel: true } }) : Promise.resolve([]),
  ]);

  const suggestions = [
    ...regions.map((item) => ({ id: `region-${item.key}`, label: item.label, meta: 'Região', href: `/buscar?q=${encodeURIComponent(item.label)}` })),
    ...events.map((item) => ({ id: `event-${item.id}`, label: item.title, meta: `Evento · ${item.locationLabel}`, href: `/eventos/${item.slug || item.id}` })),
    ...businesses.map((item) => ({ id: `business-${item.id}`, label: item.name, meta: `Negócio · ${item.category}`, href: `/negocios/${item.slug || item.id}` })),
    ...groups.map((item) => ({ id: `group-${item.id}`, label: item.name, meta: `Grupo${item.category ? ` · ${item.category}` : ''}`, href: `/grupos/${item.slug}` })),
    ...people.map((item) => ({ id: `person-${item.id}`, label: item.name || `@${item.username}`, meta: item.locationLabel || 'Pessoa', href: `/${item.username}` })),
    ...posts.map((item) => ({ id: `post-${item.id}`, label: item.content.slice(0, 72), meta: `Comunidade · ${item.locationLabel}`, href: `/community?post=${item.id}` })),
  ].slice(0, 8);

  return NextResponse.json({ suggestions }, { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } });
}
