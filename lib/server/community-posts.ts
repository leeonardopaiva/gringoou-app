import 'server-only';

import { CommunityPostStatus } from '@prisma/client';
import type { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import type { Post } from '@/types';

const LIKERS_PREVIEW_LIMIT = 8;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 20;

export type CommunityPostsPage = {
  posts: Post[];
  hasMore: boolean;
  nextOffset: number;
  nextCursor: string | null;
};

export function normalizeCommunityPagination(limit = DEFAULT_LIMIT, offset = 0) {
  const normalizedLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const normalizedOffset = Number.isFinite(offset) ? Math.max(Math.trunc(offset), 0) : 0;
  return { limit: normalizedLimit, offset: normalizedOffset };
}

export async function getCommunityPostsPage({
  session,
  regionKey,
  businessId,
  groupId,
  includeBusinessPending = false,
  canManageGroup = false,
  limit = DEFAULT_LIMIT,
  offset = 0,
  cursor,
}: {
  session: Session | null;
  regionKey?: string | null;
  businessId?: string | null;
  groupId?: string | null;
  includeBusinessPending?: boolean;
  canManageGroup?: boolean;
  limit?: number;
  offset?: number;
  cursor?: string | null;
}): Promise<CommunityPostsPage> {
  const pagination = normalizeCommunityPagination(limit, offset);
  const isAdmin = session?.user?.role === 'ADMIN';
  const viewerId = session?.user?.id;

  const posts = await prisma.communityPost.findMany({
    where: {
      OR: [
        { status: CommunityPostStatus.PUBLISHED },
        ...(session?.user?.id
          ? [
              { status: CommunityPostStatus.PENDING_REVIEW, authorId: session.user.id },
              ...(isAdmin ? [{ status: CommunityPostStatus.PENDING_REVIEW }] : []),
              ...(includeBusinessPending && businessId
                ? [{ status: CommunityPostStatus.PENDING_REVIEW, businessAuthorId: businessId }]
                : []),
            ]
          : []),
      ],
      ...(regionKey ? { regionKey } : {}),
      ...(businessId ? { businessAuthorId: businessId } : {}),
      groupId: groupId ?? null,
      ...(viewerId
        ? {
            AND: [
              { preferences: { none: { userId: viewerId, isHidden: true } } },
              { author: { mutedByUsers: { none: { userId: viewerId } } } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: pagination.limit + 1,
    skip: cursor ? 1 : pagination.offset,
    ...(cursor ? { cursor: { id: cursor } } : {}),
    include: {
      author: { select: { id: true, name: true, username: true, image: true, locationLabel: true } },
      businessAuthor: { select: { id: true, name: true, slug: true, imageUrl: true, locationLabel: true } },
      comments: {
        where: { parentId: null },
        orderBy: [{ createdAt: 'desc' }],
        take: 3,
        include: { author: { select: { id: true, name: true, username: true, image: true } }, replies: { orderBy: { createdAt: 'asc' }, take: 20, include: { author: { select: { id: true, name: true, username: true, image: true } } } } },
      },
      reactions: {
        orderBy: [{ createdAt: 'desc' }],
        select: { authorId: true, author: { select: { id: true, name: true, username: true, image: true } } },
      },
      preferences: viewerId ? { where: { userId: viewerId }, select: { isSaved: true, isInterested: true } } : false,
      _count: { select: { comments: true, reactions: true } },
    },
  });

  const hasMore = posts.length > pagination.limit;
  const pagePosts = hasMore ? posts.slice(0, pagination.limit) : posts;

  return {
    posts: pagePosts.map((post) => {
      const isPostOwner = session?.user?.id === post.authorId;
      const displayAuthor = post.businessAuthor
        ? {
            id: post.businessAuthor.id,
            name: post.businessAuthor.name,
            username: null,
            image: post.businessAuthor.imageUrl,
            locationLabel: post.businessAuthor.locationLabel,
          }
        : { ...post.author, name: post.author.name || 'Usuario da comunidade' };

      return {
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl,
        externalUrl: post.externalUrl,
        status: post.status,
        createdAt: post.createdAt.toISOString(),
        locationLabel: post.locationLabel,
        author: displayAuthor,
        authorHref: post.businessAuthor
          ? `/negocios/${post.businessAuthor.slug || post.businessAuthor.id}`
          : post.author.username
            ? `/${post.author.username}`
            : undefined,
        authorType: post.businessAuthor ? 'BUSINESS' as const : 'USER' as const,
        comments: [...post.comments].reverse().map((comment) => {
          const canManageComment = isAdmin || canManageGroup || session?.user?.id === comment.authorId;
          return {
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
            author: { ...comment.author, name: comment.author.name || 'Usuario da comunidade' },
            replies: comment.replies.map((reply) => ({ id: reply.id, parentId: comment.id, content: reply.content, createdAt: reply.createdAt.toISOString(), author: { ...reply.author, name: reply.author.name || 'Usuario da comunidade' }, canEdit: isAdmin || canManageGroup || session?.user?.id === reply.authorId, canDelete: isAdmin || canManageGroup || session?.user?.id === reply.authorId })),
            canEdit: canManageComment,
            canDelete: canManageComment,
          };
        }),
        likeCount: post._count.reactions,
        commentCount: post._count.comments,
        viewerHasLiked: Boolean(session?.user?.id && post.reactions.some((reaction) => reaction.authorId === session.user.id)),
        likedBy: post.reactions.slice(0, LIKERS_PREVIEW_LIMIT).map((reaction) => ({
          id: reaction.author.id,
          name: reaction.author.name || 'Usuario da comunidade',
          username: reaction.author.username,
          image: reaction.author.image,
        })),
        canEdit: isAdmin || isPostOwner || canManageGroup,
        canDelete: isAdmin || isPostOwner || canManageGroup,
        viewerHasSaved: post.preferences[0]?.isSaved ?? false,
        viewerIsInterested: post.preferences[0]?.isInterested ?? false,
      };
    }),
    hasMore,
    nextOffset: pagination.offset + pagePosts.length,
    nextCursor: hasMore ? pagePosts.at(-1)?.id ?? null : null,
  };
}
