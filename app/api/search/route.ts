import { BusinessStatus, CommunityPostStatus, EventStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getVisibilityFilter } from '@/lib/visibility';

const SEARCH_RESULTS_LIMIT = 6;

const SEARCH_SYNONYM_GROUPS = [
  ['advogado', 'advogada', 'lawyer', 'attorney', 'imigração', 'immigration'],
  ['contador', 'contabilidade', 'accountant', 'tax', 'imposto'],
  ['restaurante', 'restaurant', 'comida', 'food', 'brasileiro', 'brazilian'],
  ['emprego', 'trabalho', 'vaga', 'job', 'work'],
  ['moradia', 'aluguel', 'casa', 'apartamento', 'housing', 'rent'],
  ['pintor', 'pintura', 'painter', 'painting'],
  ['limpeza', 'faxina', 'cleaning', 'cleaner'],
  ['evento', 'festa', 'encontro', 'event', 'party', 'meetup'],
] as const;

const normalizeSearchTerm = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const buildSearchIntelligence = (query: string) => {
  const normalizedWords = normalizeSearchTerm(query).split(/\s+/).filter((word) => word.length >= 3);
  const expanded = SEARCH_SYNONYM_GROUPS
    .filter((group) => group.some((term) => normalizedWords.includes(normalizeSearchTerm(term))))
    .flat();
  const terms = Array.from(new Set([query, ...expanded])).slice(0, 10);
  return {
    enabled: true,
    used: terms.length > 1,
    summary: terms.length > 1 ? 'Também consideramos termos relacionados em português e inglês para encontrar resultados mais úteis.' : null,
    terms,
  };
};

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';
  const viewerRegionKey = session?.user?.regionKey ?? searchParams.get('region');

  if (!query) {
    return NextResponse.json({
      query: '',
      businesses: [],
      events: [],
      posts: [],
      counts: {
        businesses: 0,
        events: 0,
        posts: 0,
        total: 0,
      },
      intelligence: { enabled: true, used: false, summary: null, terms: [] },
    });
  }

  const normalizedQuery = query.slice(0, 80);
  const intelligence = buildSearchIntelligence(normalizedQuery);
  const searchTerms = intelligence.terms;
  const now = new Date();

  await prisma.analyticsEvent.create({
    data: {
      type: 'search_query',
      targetType: 'search',
      targetKey: normalizedQuery.toLowerCase(),
      label: normalizedQuery,
      sourcePath: '/buscar',
      sourceSection: 'search',
      regionKey: viewerRegionKey || null,
      userId: session?.user?.id || null,
    },
  }).catch((error) => {
    console.error('Failed to track search query:', error);
  });

  const businessWhere: Prisma.BusinessWhereInput = {
    status: BusinessStatus.PUBLISHED,
    OR: searchTerms.flatMap((term) => [
      { name: { contains: term, mode: Prisma.QueryMode.insensitive } },
      { category: { contains: term, mode: Prisma.QueryMode.insensitive } },
      { address: { contains: term, mode: Prisma.QueryMode.insensitive } },
      { description: { contains: term, mode: Prisma.QueryMode.insensitive } },
    ]),
    ...getVisibilityFilter(viewerRegionKey),
  };

  const eventWhere: Prisma.EventWhereInput = {
    status: EventStatus.PUBLISHED,
    startsAt: {
      gte: now,
    },
    OR: searchTerms.flatMap((term) => [
      { title: { contains: term, mode: Prisma.QueryMode.insensitive } },
      { description: { contains: term, mode: Prisma.QueryMode.insensitive } },
      { venueName: { contains: term, mode: Prisma.QueryMode.insensitive } },
      { locationLabel: { contains: term, mode: Prisma.QueryMode.insensitive } },
    ]),
    ...getVisibilityFilter(viewerRegionKey),
  };

  const postWhere: Prisma.CommunityPostWhereInput = {
    status: CommunityPostStatus.PUBLISHED,
    ...(viewerRegionKey ? { regionKey: viewerRegionKey } : {}),
    OR: searchTerms.flatMap((term) => [
      { content: { contains: term, mode: Prisma.QueryMode.insensitive } },
      { locationLabel: { contains: term, mode: Prisma.QueryMode.insensitive } },
      { author: { OR: [
        { name: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { username: { contains: term, mode: Prisma.QueryMode.insensitive } },
      ] } },
      { businessAuthor: { OR: [
        { name: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { category: { contains: term, mode: Prisma.QueryMode.insensitive } },
      ] } },
    ]),
  };

  const [businesses, businessCount, events, eventCount, posts, postCount] = await Promise.all([
    prisma.business.findMany({
      where: businessWhere,
      orderBy: [{ ratingCount: 'desc' }, { createdAt: 'desc' }],
      take: SEARCH_RESULTS_LIMIT,
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        address: true,
        description: true,
        imageUrl: true,
        locationLabel: true,
        ratingAverage: true,
        ratingCount: true,
      },
    }),
    prisma.business.count({ where: businessWhere }),
    prisma.event.findMany({
      where: eventWhere,
      orderBy: [{ startsAt: 'asc' }],
      take: SEARCH_RESULTS_LIMIT,
      select: {
        id: true,
        slug: true,
        title: true,
        venueName: true,
        startsAt: true,
        locationLabel: true,
        description: true,
        imageUrl: true,
        ratingAverage: true,
        ratingCount: true,
      },
    }),
    prisma.event.count({ where: eventWhere }),
    prisma.communityPost.findMany({
      where: postWhere,
      orderBy: [{ createdAt: 'desc' }],
      take: SEARCH_RESULTS_LIMIT,
      select: {
        id: true,
        content: true,
        imageUrl: true,
        createdAt: true,
        locationLabel: true,
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        businessAuthor: {
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    }),
    prisma.communityPost.count({ where: postWhere }),
  ]);

  return NextResponse.json({
    query: normalizedQuery,
    businesses,
    events,
    posts: posts.map(({ businessAuthor, author, ...post }) => ({
      ...post,
      author: businessAuthor
        ? { id: businessAuthor.id, name: businessAuthor.name, username: null, image: businessAuthor.imageUrl }
        : author,
      authorHref: businessAuthor
        ? `/negocios/${businessAuthor.slug || businessAuthor.id}`
        : author.username
          ? `/${author.username}`
          : '/community',
      authorType: businessAuthor ? 'BUSINESS' : 'USER',
    })),
    counts: {
      businesses: businessCount,
      events: eventCount,
      posts: postCount,
      total: businessCount + eventCount + postCount,
    },
    intelligence,
  });
}
