import 'server-only';

import { BusinessStatus, CommunityPostStatus, EventStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getVisibilityFilter } from '@/lib/visibility';
import { getLatestPublishedNews } from '@/lib/server/news-articles';
import type { HomeInitialData } from '@/lib/content-contracts';

const EMPTY_HOME_DATA: HomeInitialData = {
  latestPost: null,
  latestBusiness: null,
  latestEvent: null,
  latestNews: null,
};

export async function getHomeInitialData(regionKey?: string | null): Promise<HomeInitialData> {
  if (!regionKey) return EMPTY_HOME_DATA;

  try {
    const [post, business, event, latestNews] = await Promise.all([
      prisma.communityPost.findFirst({
        where: { status: CommunityPostStatus.PUBLISHED, regionKey },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          content: true,
          imageUrl: true,
          externalUrl: true,
          createdAt: true,
          locationLabel: true,
          author: { select: { id: true, name: true, username: true, image: true, locationLabel: true } },
          _count: { select: { comments: true, reactions: true } },
        },
      }),
      prisma.business.findFirst({
        where: { status: BusinessStatus.PUBLISHED, ...getVisibilityFilter(regionKey) },
        orderBy: { createdAt: 'desc' },
        select: { id: true, slug: true, name: true, category: true, address: true, imageUrl: true, locationLabel: true },
      }),
      prisma.event.findFirst({
        where: {
          status: EventStatus.PUBLISHED,
          startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          ...getVisibilityFilter(regionKey),
        },
        orderBy: { startsAt: 'asc' },
        select: { id: true, slug: true, title: true, venueName: true, startsAt: true, locationLabel: true, imageUrl: true },
      }),
      getLatestPublishedNews().catch(() => null),
    ]);

    return {
      latestPost: post
        ? {
            id: post.id,
            author: { ...post.author, name: post.author.name || 'Usuario da comunidade' },
            content: post.content,
            createdAt: post.createdAt.toISOString(),
            locationLabel: post.locationLabel,
            imageUrl: post.imageUrl,
            externalUrl: post.externalUrl,
            likeCount: post._count.reactions,
            commentCount: post._count.comments,
            viewerHasLiked: false,
            likedBy: [],
            comments: [],
          }
        : null,
      latestBusiness: business ? { ...business, publicPath: `/businesses/${business.slug || business.id}` } : null,
      latestEvent: event
        ? { ...event, startsAt: event.startsAt.toISOString(), publicPath: `/events/${event.slug || event.id}` }
        : null,
      latestNews,
    };
  } catch (error) {
    console.error('Failed to load initial Home data on the server:', error);
    return EMPTY_HOME_DATA;
  }
}
