import 'server-only';

import { NewsArticleStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { NewsArticleInput } from '@/lib/news';
import type { NewsArticleContract, NewsAdminArticleContract } from '@/lib/content-contracts';

const PUBLIC_PAGE_SIZE = 10;
const ADMIN_PAGE_SIZE = 20;

type ArticleRow = Prisma.NewsArticleGetPayload<{ include: { author: { select: { id: true; name: true } } } }> & {
  likes?: { user: { id: string; name: string | null; username: string | null; image: string | null } }[];
  _count?: { likes: number };
};

/** Contagem de curtidas e as 3 mais recentes (para mostrar quem curtiu). */
const likeInclude = () => ({
  _count: { select: { likes: true } },
  likes: {
    orderBy: { createdAt: 'desc' as const },
    take: 3,
    select: { user: { select: { id: true, name: true, username: true, image: true } } },
  },
});

const encodeCursor = (publishedAt: Date, id: string) =>
  Buffer.from(`${publishedAt.toISOString()}|${id}`).toString('base64url');

const decodeCursor = (cursor: string | null | undefined): { at: Date; id: string } | null => {
  if (!cursor) return null;
  try {
    const [iso, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
    const at = new Date(iso);
    return id && !Number.isNaN(at.getTime()) ? { at, id } : null;
  } catch {
    return null;
  }
};

async function regionLabels(keys: Array<string | null>): Promise<Map<string, string>> {
  const unique = [...new Set(keys.filter((key): key is string => Boolean(key)))];
  if (unique.length === 0) return new Map();
  const regions = await prisma.region.findMany({ where: { key: { in: unique } }, select: { key: true, label: true } });
  return new Map(regions.map((region) => [region.key, region.label]));
}

const toContract = (row: ArticleRow, labels: Map<string, string>, likedIds?: Set<string>): NewsArticleContract => ({
  id: row.id,
  title: row.title,
  subtitle: row.subtitle,
  imageUrl: row.imageUrl,
  category: row.category,
  regionKey: row.regionKey,
  regionLabel: row.regionKey ? (labels.get(row.regionKey) ?? null) : null,
  source: row.source,
  externalUrl: row.externalUrl,
  publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
  likeCount: row._count?.likes ?? 0,
  viewerLiked: likedIds?.has(row.id) ?? false,
  recentLikers: (row.likes ?? []).map((like) => like.user),
});

export type PublicNewsFilters = {
  regionKey?: string | null;
  category?: string | null;
  source?: string | null;
  query?: string | null;
  sort?: 'recent' | 'oldest';
  cursor?: string | null;
  limit?: number;
  /** Pessoa logada (para saber se já curtiu). */
  viewerId?: string | null;
};

/** Feed público: somente PUBLISHED com data de publicação já vencida, paginado por cursor. */
export async function listPublishedNews(filters: PublicNewsFilters) {
  const limit = Math.min(Math.max(filters.limit ?? PUBLIC_PAGE_SIZE, 1), 30);
  const oldestFirst = filters.sort === 'oldest';
  const cursor = decodeCursor(filters.cursor);
  const and: Prisma.NewsArticleWhereInput[] = [];

  if (filters.regionKey) and.push({ OR: [{ regionKey: filters.regionKey }, { regionKey: null }] });
  if (filters.query) {
    and.push({
      OR: [
        { title: { contains: filters.query, mode: 'insensitive' } },
        { subtitle: { contains: filters.query, mode: 'insensitive' } },
        { source: { contains: filters.query, mode: 'insensitive' } },
      ],
    });
  }
  if (cursor) {
    const cmp = oldestFirst ? 'gt' : 'lt';
    and.push({
      OR: [{ publishedAt: { [cmp]: cursor.at } }, { publishedAt: cursor.at, id: { [cmp]: cursor.id } }],
    });
  }

  const rows = await prisma.newsArticle.findMany({
    where: {
      status: NewsArticleStatus.PUBLISHED,
      publishedAt: { not: null, lte: new Date() },
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.source ? { source: { equals: filters.source, mode: 'insensitive' } } : {}),
      AND: and,
    },
    orderBy: [{ publishedAt: oldestFirst ? 'asc' : 'desc' }, { id: oldestFirst ? 'asc' : 'desc' }],
    take: limit + 1,
    include: { author: { select: { id: true, name: true } }, ...likeInclude() },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const labels = await regionLabels(page.map((row) => row.regionKey));
  const last = page[page.length - 1];
  // Quais destas notícias a pessoa logada já curtiu (uma consulta só para a página inteira).
  const likedIds = new Set<string>();
  if (filters.viewerId && page.length > 0) {
    const liked = await prisma.newsArticleLike.findMany({
      where: { userId: filters.viewerId, articleId: { in: page.map((row) => row.id) } },
      select: { articleId: true },
    });
    liked.forEach((like) => likedIds.add(like.articleId));
  }

  return {
    items: page.map((row) => toContract(row, labels, likedIds)),
    hasMore,
    nextCursor: hasMore && last?.publishedAt ? encodeCursor(last.publishedAt, last.id) : null,
  };
}

/** Fontes distintas dos artigos publicados (para o filtro público). */
export async function listPublishedNewsSources(): Promise<string[]> {
  const rows = await prisma.newsArticle.findMany({
    where: { status: NewsArticleStatus.PUBLISHED },
    distinct: ['source'],
    select: { source: true },
    orderBy: { source: 'asc' },
    take: 50,
  });
  return rows.map((row) => row.source);
}

export type AdminNewsFilters = {
  status?: 'DRAFT' | 'PUBLISHED' | null;
  authorId?: string | null;
  category?: string | null;
  from?: Date | null;
  to?: Date | null;
  query?: string | null;
  page?: number;
};

export async function listNewsForModeration(filters: AdminNewsFilters) {
  const page = Math.max(filters.page ?? 1, 1);
  const where: Prisma.NewsArticleWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.authorId ? { authorId: filters.authorId } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.from || filters.to
      ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
      : {}),
    ...(filters.query
      ? {
          OR: [
            { title: { contains: filters.query, mode: 'insensitive' } },
            { source: { contains: filters.query, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [rows, total, authors] = await Promise.all([
    prisma.newsArticle.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: { author: { select: { id: true, name: true } } },
    }),
    prisma.newsArticle.count({ where }),
    prisma.newsArticle.findMany({
      where: { authorId: { not: null } },
      distinct: ['authorId'],
      select: { author: { select: { id: true, name: true } } },
    }),
  ]);

  const labels = await regionLabels(rows.map((row) => row.regionKey));
  const items: NewsAdminArticleContract[] = rows.map((row) => ({
    ...toContract(row, labels),
    status: row.status,
    authorId: row.authorId,
    authorName: row.author?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return {
    items,
    total,
    page,
    totalPages: Math.max(Math.ceil(total / ADMIN_PAGE_SIZE), 1),
    authors: authors.flatMap((row) => (row.author ? [{ id: row.author.id, name: row.author.name ?? 'Sem nome' }] : [])),
  };
}

const toData = (input: NewsArticleInput, previousPublishedAt?: Date | null) => {
  const published = input.status === 'PUBLISHED';
  return {
    title: input.title,
    subtitle: input.subtitle ?? null,
    imageUrl: input.imageUrl ?? null,
    category: input.category,
    regionKey: input.regionKey ?? null,
    source: input.source,
    externalUrl: input.externalUrl,
    status: input.status as NewsArticleStatus,
    publishedAt: input.publishedAt
      ? new Date(input.publishedAt)
      : published
        ? (previousPublishedAt ?? new Date())
        : (previousPublishedAt ?? null),
  };
};

export const createNewsArticle = (input: NewsArticleInput, authorId: string) =>
  prisma.newsArticle.create({ data: { ...toData(input), authorId }, select: { id: true } });

export async function updateNewsArticle(id: string, input: NewsArticleInput) {
  const existing = await prisma.newsArticle.findUnique({ where: { id }, select: { publishedAt: true } });
  if (!existing) return null;
  return prisma.newsArticle.update({ where: { id }, data: toData(input, existing.publishedAt), select: { id: true } });
}

export async function deleteNewsArticle(id: string) {
  const result = await prisma.newsArticle.deleteMany({ where: { id } });
  return result.count > 0;
}

/** Notícia publicada mais recente (card de Notícias na Home). */
export async function getLatestPublishedNews() {
  const row = await prisma.newsArticle.findFirst({
    where: { status: NewsArticleStatus.PUBLISHED, publishedAt: { not: null, lte: new Date() } },
    orderBy: [{ publishedAt: 'desc' }],
    include: { author: { select: { id: true, name: true } } },
  });
  return row ? toContract(row, new Map()) : null;
}
