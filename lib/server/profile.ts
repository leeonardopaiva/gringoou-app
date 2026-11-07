import 'server-only';

import { prisma } from '@/lib/prisma';
import type { ProfileInitialData } from '@/lib/content-contracts';

export async function getProfileData(userId: string): Promise<ProfileInitialData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, username: true, email: true, phone: true, image: true,
      coverImageUrl: true, bio: true, interests: true, galleryUrls: true,
      locationLabel: true, regionKey: true, updatedAt: true,
      gender: true, age: true, timeAbroad: true, birthCity: true,
    },
  });
  if (!user) return null;

  const [businesses, events] = await Promise.all([
    prisma.business.findMany({
      where: { OR: [{ createdById: userId }, { members: { some: { userId } } }] },
      orderBy: [{ updatedAt: 'desc' }], take: 12,
      select: { id: true, slug: true, name: true, category: true, status: true, imageUrl: true, locationLabel: true, regionKey: true, updatedAt: true },
    }),
    prisma.event.findMany({
      where: { createdById: userId }, orderBy: [{ updatedAt: 'desc' }], take: 12,
      select: { id: true, slug: true, title: true, startsAt: true, status: true, imageUrl: true, locationLabel: true, updatedAt: true },
    }),
  ]);

  return {
    user: { ...user, updatedAt: user.updatedAt.toISOString() },
    professionalProfile: {
      businessCount: businesses.length,
      eventCount: events.length,
      identity: businesses[0] ? {
        id: businesses[0].id, name: businesses[0].name, slug: businesses[0].slug || businesses[0].id,
        imageUrl: businesses[0].imageUrl, locationLabel: businesses[0].locationLabel,
        regionKey: businesses[0].regionKey, publicPath: `/businesses/${businesses[0].slug || businesses[0].id}`,
      } : null,
      businesses: businesses.map(({ updatedAt, ...business }) => ({
        ...business, updatedAt: updatedAt.toISOString(), publicPath: `/businesses/${business.slug || business.id}`,
      })),
      events: events.map(({ startsAt, updatedAt, ...event }) => ({
        ...event, startsAt: startsAt.toISOString(), updatedAt: updatedAt.toISOString(), publicPath: `/events/${event.slug || event.id}`,
      })),
    },
  };
}
