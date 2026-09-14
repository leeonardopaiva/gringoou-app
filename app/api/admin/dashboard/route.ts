import { BusinessStatus, CommunityPostStatus, EventStatus, SuggestionStatus, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ensureRegionCatalog } from '@/lib/region-store';
import { requireAdminSession } from '@/lib/require-admin';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const { response } = await requireAdminSession();

  if (response) {
    return response;
  }

  await ensureRegionCatalog();

  const [
    pendingBusinesses,
    pendingEvents,
    pendingPosts,
    banners,
    businesses,
    events,
    users,
    totalUsers,
    publishedBusinesses,
    publishedEvents,
    publishedPosts,
    businessOwners,
    totalRegions,
    activeRegions,
    regions,
    newSuggestions,
    suggestions,
  ] = await Promise.all([
    prisma.business.findMany({
      where: { status: BusinessStatus.PENDING_REVIEW },
      orderBy: [{ createdAt: 'asc' }],
      take: 12,
      select: {
        id: true,
        name: true,
        category: true,
        address: true,
        locationLabel: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.event.findMany({
      where: { status: EventStatus.PENDING_REVIEW },
      orderBy: [{ createdAt: 'asc' }],
      take: 12,
      select: {
        id: true,
        title: true,
        venueName: true,
        locationLabel: true,
        startsAt: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.communityPost.findMany({
      where: { status: CommunityPostStatus.PENDING_REVIEW },
      orderBy: [{ createdAt: 'asc' }],
      take: 12,
      select: {
        id: true,
        content: true,
        locationLabel: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    }),
    prisma.banner.findMany({
      where: { adAccountId: null },
      orderBy: [{ updatedAt: 'desc' }],
      take: 18,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        type: true,
        placement: true,
        targetUrl: true,
        regionKey: true,
        isActive: true,
        campaignStatus: true,
        objective: true,
        billingMode: true,
        paymentStatus: true,
        targetInterests: true,
        targetKeywords: true,
        targetCategories: true,
        startsAt: true,
        endsAt: true,
        dailyBudgetCents: true,
        totalBudgetCents: true,
        bidCents: true,
        spentCents: true,
        checkoutUrl: true,
        paymentProvider: true,
        createdAt: true,
        updatedAt: true,
        region: {
          select: {
            key: true,
            label: true,
          },
        },
        _count: {
          select: {
            registrations: true,
            impressions: true,
          },
        },
        registrations: {
          orderBy: [{ createdAt: 'desc' }],
          take: 5,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            locationLabel: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.business.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      take: 18,
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        description: true,
        phone: true,
        whatsapp: true,
        website: true,
        instagram: true,
        address: true,
        locationLabel: true,
        regionKey: true,
        visibilityScope: true,
        visibilityRegionKey: true,
        imageUrl: true,
        galleryUrls: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        visibilityRegion: {
          select: {
            key: true,
            label: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.event.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      take: 18,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        venueName: true,
        startsAt: true,
        endsAt: true,
        locationLabel: true,
        regionKey: true,
        visibilityScope: true,
        visibilityRegionKey: true,
        externalUrl: true,
        imageUrl: true,
        galleryUrls: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        visibilityRegion: {
          select: {
            key: true,
            label: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      take: 24,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        locationLabel: true,
        regionKey: true,
        onboardingCompleted: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count(),
    prisma.business.count({ where: { status: BusinessStatus.PUBLISHED } }),
    prisma.event.count({ where: { status: EventStatus.PUBLISHED } }),
    prisma.communityPost.count({ where: { status: CommunityPostStatus.PUBLISHED } }),
    prisma.user.count({ where: { role: UserRole.BUSINESS_OWNER } }),
    prisma.region.count(),
    prisma.region.count({ where: { isActive: true } }),
    prisma.region.findMany({
      orderBy: [{ label: 'asc' }],
      select: {
        key: true,
        label: true,
        city: true,
        state: true,
        lat: true,
        lng: true,
        aliases: true,
        isActive: true,
        updatedAt: true,
      },
    }),
    prisma.suggestion.count({ where: { status: SuggestionStatus.NEW } }),
    prisma.suggestion.findMany({
      orderBy: [{ createdAt: 'desc' }],
      take: 24,
      select: {
        id: true,
        category: true,
        message: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            image: true,
            locationLabel: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    stats: {
      totalUsers,
      businessOwners,
      publishedBusinesses,
      publishedEvents,
      publishedPosts,
      pendingBusinesses: pendingBusinesses.length,
      pendingEvents: pendingEvents.length,
      pendingPosts: pendingPosts.length,
      totalRegions,
      activeRegions,
      newSuggestions,
    },
    pendingBusinesses,
    pendingEvents,
    pendingPosts,
    banners,
    businesses,
    events,
    users,
    regions,
    suggestions,
  });
}
