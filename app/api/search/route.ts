import { BusinessStatus, CommunityGroupMembershipStatus, CommunityPostStatus, EventStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getVisibilityFilter } from '@/lib/visibility';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 12;
const CATEGORIES = ['all', 'businesses', 'events', 'posts', 'people', 'groups', 'jobs', 'housing', 'interests'] as const;
type SearchCategory = (typeof CATEGORIES)[number];

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
  const terms = Array.from(new Set([query, ...expanded])).filter(Boolean).slice(0, 10);
  return {
    enabled: true,
    used: terms.length > 1,
    summary: terms.length > 1 ? 'Também consideramos termos relacionados em português e inglês.' : null,
    terms,
  };
};

const wantsCategory = (selected: SearchCategory, target: SearchCategory) => selected === 'all' || selected === target;

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q')?.trim() ?? '').slice(0, 80);
  const requestedCategory = searchParams.get('category');
  const category: SearchCategory = CATEGORIES.includes(requestedCategory as SearchCategory)
    ? requestedCategory as SearchCategory
    : 'all';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get('pageSize')) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  const explicitRegion = searchParams.has('region') ? searchParams.get('region')?.trim() || null : undefined;
  const country = searchParams.get('country')?.trim().toUpperCase().slice(0, 2) || '';
  const city = searchParams.get('city')?.trim().slice(0, 80) || '';
  const businessType = searchParams.get('businessType')?.trim().slice(0, 80) || '';
  const propertyType = searchParams.get('propertyType')?.trim().slice(0, 80) || '';
  const dateScope = searchParams.get('dateScope')?.trim() || 'future';
  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);
  const daysUntilSaturday = (6 - now.getDay() + 7) % 7;
  const weekendStart = new Date(startOfToday); weekendStart.setDate(startOfToday.getDate() + daysUntilSaturday);
  const weekendEnd = new Date(weekendStart); weekendEnd.setDate(weekendStart.getDate() + 1); weekendEnd.setHours(23, 59, 59, 999);
  const eventDateWhere: Prisma.EventWhereInput = dateScope === 'today'
    ? { startsAt: { lte: endOfToday }, OR: [{ endsAt: { gte: startOfToday } }, { endsAt: null, startsAt: { gte: startOfToday } }] }
    : dateScope === 'weekend'
      ? { startsAt: { lte: weekendEnd }, OR: [{ endsAt: { gte: weekendStart } }, { endsAt: null, startsAt: { gte: weekendStart } }] }
      : dateScope === 'ongoing'
        ? { startsAt: { lte: now }, endsAt: { gte: now } }
        : dateScope === 'past'
          ? { OR: [{ endsAt: { lt: now } }, { endsAt: null, startsAt: { lt: now } }] }
          : dateScope === 'any' ? {} : { startsAt: { gte: now } };

  const matchingRegions = country || city
    ? await prisma.region.findMany({
        where: {
          isActive: true,
          ...(country ? { countryCode: country } : {}),
          ...(city ? {
            OR: [
              { city: { contains: city, mode: Prisma.QueryMode.insensitive } },
              { state: { contains: city, mode: Prisma.QueryMode.insensitive } },
              { label: { contains: city, mode: Prisma.QueryMode.insensitive } },
            ],
          } : {}),
        },
        select: { key: true },
      })
    : [];
  const filteredRegionKeys = matchingRegions.map((region) => region.key);
  const viewerRegionKey = explicitRegion === undefined ? session?.user?.regionKey : explicitRegion;
  const regionWhere = explicitRegion
    ? { regionKey: explicitRegion }
    : filteredRegionKeys.length > 0
      ? { regionKey: { in: filteredRegionKeys } }
      : country || city
        ? { regionKey: { in: [] as string[] } }
        : {};

  const intelligence = buildSearchIntelligence(query);
  const terms = intelligence.terms;

  if (query) {
    await prisma.analyticsEvent.create({
      data: {
        type: 'search_query', targetType: 'search', targetKey: query.toLowerCase(), label: query,
        sourcePath: '/buscar', sourceSection: category, regionKey: viewerRegionKey || null,
        userId: session?.user?.id || null,
      },
    }).catch((error) => console.error('Failed to track search query:', error));
  }

  const businessWhere: Prisma.BusinessWhereInput = {
    status: BusinessStatus.PUBLISHED,
    AND: [
      ...(query ? [{ OR: terms.flatMap((term) => [
        { name: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { category: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { address: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: term, mode: Prisma.QueryMode.insensitive } },
      ]) }] : []),
      getVisibilityFilter(viewerRegionKey),
    ],
    ...(businessType ? { category: { contains: businessType, mode: Prisma.QueryMode.insensitive } } : {}),
    ...regionWhere,
  };
  const eventWhere: Prisma.EventWhereInput = {
    status: EventStatus.PUBLISHED,
    ...eventDateWhere,
    AND: [
      ...(query ? [{ OR: terms.flatMap((term) => [
        { title: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { venueName: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { locationLabel: { contains: term, mode: Prisma.QueryMode.insensitive } },
      ]) }] : []),
      getVisibilityFilter(viewerRegionKey),
    ],
    ...regionWhere,
  };
  const postWhere: Prisma.CommunityPostWhereInput = {
    status: CommunityPostStatus.PUBLISHED,
    groupId: null,
    ...(query ? { OR: terms.flatMap((term) => [
      { content: { contains: term, mode: Prisma.QueryMode.insensitive } },
      { locationLabel: { contains: term, mode: Prisma.QueryMode.insensitive } },
      { author: { OR: [
        { name: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { username: { contains: term, mode: Prisma.QueryMode.insensitive } },
      ] } },
    ]) } : {}),
    ...(viewerRegionKey && !Object.keys(regionWhere).length ? { regionKey: viewerRegionKey } : regionWhere),
  };
  const normalizedPersonQuery = query.startsWith('@') ? query.slice(1) : query;
  const isEmailQuery = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query);
  if (isEmailQuery) {
    if (!session?.user?.id) return NextResponse.json({ error: 'Entre na sua conta para buscar um email.' }, { status: 401 });
    const emailLookupLimit = await consumeRateLimit({ scope: 'search:email', key: getRateLimitKey(request, session.user.id), max: 20, windowMs: 60 * 60 * 1000 });
    if (!emailLookupLimit.allowed) return NextResponse.json({ error: 'Limite de buscas por email atingido.' }, { status: 429, headers: buildRateLimitHeaders(emailLookupLimit) });
  }
  const peopleWhere: Prisma.UserWhereInput = {
    onboardingCompleted: true,
    username: { not: null },
    NOT: session?.user?.id ? { id: session.user.id } : undefined,
    ...(query ? isEmailQuery
      ? { email: { equals: query.toLowerCase(), mode: Prisma.QueryMode.insensitive } }
      : { OR: [
          { name: { contains: normalizedPersonQuery, mode: Prisma.QueryMode.insensitive } },
          { username: { contains: normalizedPersonQuery, mode: Prisma.QueryMode.insensitive } },
          { interests: { has: query } },
        ] } : {}),
    ...regionWhere,
  };
  const groupWhere: Prisma.CommunityGroupWhereInput = {
    AND: [
      {
        OR: [
          { isPublic: true },
          ...(session?.user?.id
            ? [{
                members: {
                  some: {
                    userId: session.user.id,
                    status: { in: [CommunityGroupMembershipStatus.APPROVED, CommunityGroupMembershipStatus.PENDING] },
                  },
                },
              }]
            : []),
        ],
      },
      ...(query ? [{ OR: [
        { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
        { category: { contains: query, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: query, mode: Prisma.QueryMode.insensitive } },
      ] }] : []),
      ...(country ? [{ countryCode: country }] : []),
      ...(Object.keys(regionWhere).length ? [regionWhere] : []),
    ],
  };
  const jobWhere: Prisma.JobWhereInput = {
    isActive: true,
    ...(country ? { countryCode: country } : {}),
    ...(query ? { OR: [
      { title: { contains: query, mode: Prisma.QueryMode.insensitive } },
      { company: { contains: query, mode: Prisma.QueryMode.insensitive } },
      { description: { contains: query, mode: Prisma.QueryMode.insensitive } },
      { locationLabel: { contains: query, mode: Prisma.QueryMode.insensitive } },
    ] } : {}),
    ...(city ? { locationLabel: { contains: city, mode: Prisma.QueryMode.insensitive } } : {}),
  };
  const housingWhere: Prisma.HousingWhereInput = {
    isActive: true,
    ...(query ? { OR: terms.flatMap((term) => [
      { title: { contains: term, mode: Prisma.QueryMode.insensitive } },
      { description: { contains: term, mode: Prisma.QueryMode.insensitive } },
      { propertyType: { contains: term, mode: Prisma.QueryMode.insensitive } },
      { locationLabel: { contains: term, mode: Prisma.QueryMode.insensitive } },
    ]) } : {}),
    ...(propertyType ? { propertyType: { contains: propertyType, mode: Prisma.QueryMode.insensitive } } : {}),
    ...(city ? { locationLabel: { contains: city, mode: Prisma.QueryMode.insensitive } } : {}),
  };

  const emptyPage = <T,>() => Promise.resolve([[] as T[], 0] as const);
  const [businessResult, eventResult, postResult, peopleResult, groupResult, jobResult, housingResult, interestUsers] = await Promise.all([
    wantsCategory(category, 'businesses') ? Promise.all([
      prisma.business.findMany({ where: businessWhere, orderBy: [{ ratingAverage: 'desc' }, { ratingCount: 'desc' }, { createdAt: 'desc' }], skip, take: limit, select: { id: true, slug: true, name: true, category: true, address: true, description: true, imageUrl: true, locationLabel: true, ratingAverage: true, ratingCount: true } }),
      prisma.business.count({ where: businessWhere }),
    ]) : emptyPage<never>(),
    wantsCategory(category, 'events') ? Promise.all([
      prisma.event.findMany({ where: eventWhere, orderBy: [{ startsAt: 'asc' }], skip, take: limit, select: { id: true, slug: true, title: true, venueName: true, startsAt: true, endsAt: true, locationLabel: true, description: true, imageUrl: true, ratingAverage: true, ratingCount: true } }),
      prisma.event.count({ where: eventWhere }),
    ]) : emptyPage<never>(),
    wantsCategory(category, 'posts') ? Promise.all([
      prisma.communityPost.findMany({ where: postWhere, orderBy: [{ createdAt: 'desc' }], skip, take: limit, select: { id: true, content: true, imageUrl: true, createdAt: true, locationLabel: true, author: { select: { id: true, name: true, username: true, image: true } }, businessAuthor: { select: { id: true, name: true, slug: true, imageUrl: true } }, _count: { select: { comments: true, reactions: true } } } }),
      prisma.communityPost.count({ where: postWhere }),
    ]) : emptyPage<never>(),
    wantsCategory(category, 'people') ? Promise.all([
      prisma.user.findMany({ where: peopleWhere, orderBy: [{ name: 'asc' }], skip, take: limit, select: { id: true, name: true, username: true, image: true, locationLabel: true, interests: true } }),
      prisma.user.count({ where: peopleWhere }),
    ]) : emptyPage<never>(),
    wantsCategory(category, 'groups') ? Promise.all([
      prisma.communityGroup.findMany({ where: groupWhere, orderBy: [{ createdAt: 'desc' }], skip, take: limit, select: { id: true, name: true, slug: true, description: true, imageUrl: true, coverImageUrl: true, category: true, countryCode: true, isPublic: true, region: { select: { label: true } }, _count: { select: { members: { where: { status: 'APPROVED' } } } } } }),
      prisma.communityGroup.count({ where: groupWhere }),
    ]) : emptyPage<never>(),
    wantsCategory(category, 'jobs') ? Promise.all([
      prisma.job.findMany({ where: jobWhere, orderBy: [{ createdAt: 'desc' }], skip, take: limit, select: { id: true, title: true, company: true, employmentType: true, locationLabel: true, salary: true, createdAt: true } }),
      prisma.job.count({ where: jobWhere }),
    ]) : emptyPage<never>(),
    wantsCategory(category, 'housing') ? Promise.all([
      prisma.housing.findMany({ where: housingWhere, orderBy: [{ createdAt: 'desc' }], skip, take: limit, select: { id: true, title: true, description: true, propertyType: true, locationLabel: true, price: true, imageUrl: true, createdAt: true } }),
      prisma.housing.count({ where: housingWhere }),
    ]) : emptyPage<never>(),
    wantsCategory(category, 'interests') && query
      ? prisma.user.findMany({ where: { onboardingCompleted: true, interests: { isEmpty: false } }, take: 100, select: { interests: true } })
      : Promise.resolve([]),
  ]);

  const [businesses, businessCount] = businessResult;
  const [events, eventCount] = eventResult;
  const [posts, postCount] = postResult;
  const [people, peopleCount] = peopleResult;
  const [groups, groupCount] = groupResult;
  const [jobs, jobCount] = jobResult;
  const [housing, housingCount] = housingResult;
  const matchingInterests = Array.from(new Set(interestUsers.flatMap((user) => user.interests).filter((interest) => normalizeSearchTerm(interest).includes(normalizeSearchTerm(query)))));
  const interests = matchingInterests.slice(skip, skip + limit);
  const counts = { businesses: businessCount, events: eventCount, posts: postCount, people: peopleCount, groups: groupCount, jobs: jobCount, housing: housingCount, interests: matchingInterests.length };
  const selectedCount = category === 'all' ? Math.max(...Object.values(counts)) : counts[category];

  return NextResponse.json({
    query, category, page, pageSize: limit,
    filters: { region: viewerRegionKey || '', country, city, businessType, propertyType, dateScope },
    businesses, events, people, groups, jobs, housing, interests,
    posts: posts.map(({ businessAuthor, author, ...post }) => ({
      ...post,
      author: businessAuthor ? { id: businessAuthor.id, name: businessAuthor.name, username: null, image: businessAuthor.imageUrl } : author,
      authorHref: businessAuthor ? `/negocios/${businessAuthor.slug || businessAuthor.id}` : author.username ? `/${author.username}` : '/community',
      authorType: businessAuthor ? 'BUSINESS' : 'USER',
    })),
    counts: { ...counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0) },
    pagination: { page, pageSize: limit, totalPages: Math.max(1, Math.ceil(selectedCount / limit)) },
    intelligence,
  });
}
