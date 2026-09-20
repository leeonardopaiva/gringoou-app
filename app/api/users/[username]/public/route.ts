import { BusinessStatus, CommunityPostStatus, EventStatus, FriendRequestStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getVisibilityFilter } from '@/lib/visibility';

type RouteContext = {
  params: Promise<{
    username: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  const { username } = await context.params;
  const normalizedUsername = username.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      username: normalizedUsername,
    },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      coverImageUrl: true,
      bio: true,
      interests: true,
      galleryUrls: true,
      locationLabel: true,
      regionKey: true,
      birthCity: true,
      createdAt: true,
    },
  });

  if (!user?.username) {
    return NextResponse.json({ error: 'Perfil publico nao encontrado.' }, { status: 404 });
  }

  const postVisibilityWhere = session?.user?.regionKey
    ? {
        authorId: user.id,
        businessAuthorId: null,
        groupId: null,
        status: CommunityPostStatus.PUBLISHED,
        regionKey: session.user.regionKey,
      }
    : null;

  const [
    posts,
    friends,
    groups,
    friendship,
    friendCount,
    postCount,
    businesses,
    events,
  ] = await Promise.all([
    postVisibilityWhere
      ? prisma.communityPost.findMany({
          where: postVisibilityWhere,
          orderBy: [{ createdAt: 'desc' }],
          take: 4,
          select: {
            id: true,
            content: true,
            imageUrl: true,
            createdAt: true,
            locationLabel: true,
            _count: {
              select: {
                reactions: true,
                comments: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    prisma.friendRequest.findMany({
      where: {
        status: FriendRequestStatus.ACCEPTED,
        OR: [{ requesterId: user.id }, { recipientId: user.id }],
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 24,
      select: {
        id: true,
        requesterId: true,
        recipientId: true,
        requester: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            locationLabel: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            locationLabel: true,
          },
        },
      },
    }),
    prisma.communityGroupMember.findMany({
      where: {
        userId: user.id,
        status: 'APPROVED',
        ...(session?.user?.id === user.id ? {} : { group: { isPublic: true } }),
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 24,
      select: {
        id: true,
        role: true,
        group: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            imageUrl: true,
            coverImageUrl: true,
            category: true,
            regionKey: true,
            countryCode: true,
            isPublic: true,
            region: {
              select: {
                label: true,
              },
            },
            _count: {
              select: {
                members: { where: { status: 'APPROVED' } },
              },
            },
          },
        },
      },
    }),
    session?.user?.id && session.user.id !== user.id
      ? prisma.friendRequest.findFirst({
          where: {
            OR: [
              { requesterId: session.user.id, recipientId: user.id },
              { requesterId: user.id, recipientId: session.user.id },
            ],
          },
          orderBy: [{ updatedAt: 'desc' }],
          select: {
            id: true,
            requesterId: true,
            recipientId: true,
            status: true,
          },
        })
      : Promise.resolve(null),
    prisma.friendRequest.count({
      where: {
        status: FriendRequestStatus.ACCEPTED,
        OR: [{ requesterId: user.id }, { recipientId: user.id }],
      },
    }),
    postVisibilityWhere
      ? prisma.communityPost.count({
          where: postVisibilityWhere,
        })
      : Promise.resolve(0),
    prisma.business.findMany({
      where: {
        createdById: user.id,
        status: BusinessStatus.PUBLISHED,
        ...getVisibilityFilter(session?.user?.regionKey),
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 6,
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        imageUrl: true,
        locationLabel: true,
        ratingAverage: true,
        ratingCount: true,
      },
    }),
    prisma.event.findMany({
      where: {
        createdById: user.id,
        status: EventStatus.PUBLISHED,
        startsAt: { gte: new Date() },
        ...getVisibilityFilter(session?.user?.regionKey),
      },
      orderBy: [{ startsAt: 'asc' }],
      take: 6,
      select: {
        id: true,
        slug: true,
        title: true,
        venueName: true,
        startsAt: true,
        imageUrl: true,
        locationLabel: true,
        ratingAverage: true,
        ratingCount: true,
      },
    }),
  ]);

  const friendshipStatus = (() => {
    if (!session?.user?.id) {
      return 'signed_out';
    }

    if (session.user.id === user.id) {
      return 'self';
    }

    if (!friendship) {
      return 'none';
    }

    if (friendship.status === FriendRequestStatus.ACCEPTED) {
      return 'accepted';
    }

    if (friendship.status === FriendRequestStatus.PENDING) {
      return friendship.requesterId === session.user.id ? 'pending_sent' : 'pending_received';
    }

    return 'none';
  })();

  return NextResponse.json({
    profile: {
      id: user.id,
      name: user.name || 'Usuario da comunidade',
      username: user.username,
      image: user.image,
      coverImageUrl: user.coverImageUrl,
      bio: user.bio,
      interests: user.interests,
      galleryUrls: user.galleryUrls,
      locationLabel: user.locationLabel,
      birthCity: user.birthCity,
      joinedAt: user.createdAt,
      publicPath: `/${user.username}`,
      friendFeature: {
        available: true,
        canRequest: friendshipStatus === 'none',
        status: friendshipStatus,
        requestId: friendship?.id ?? null,
      },
      stats: {
        friendCount,
        businessCount: businesses.length,
        eventCount: events.length,
        postCount,
      },
      friends: friends
        .map((friend) => {
          const connectedUser = friend.requesterId === user.id ? friend.recipient : friend.requester;

          return {
            id: connectedUser.id,
            name: connectedUser.name || 'Usuario da comunidade',
            username: connectedUser.username,
            image: connectedUser.image,
            locationLabel: connectedUser.locationLabel,
            publicPath: connectedUser.username ? `/${connectedUser.username}` : null,
          };
        })
        .filter((friend) => Boolean(friend.username)),
      groups: groups.map((membership) => ({
        id: membership.group.id,
        name: membership.group.name,
        slug: membership.group.slug,
        description: membership.group.description,
        imageUrl: membership.group.imageUrl,
        coverImageUrl: membership.group.coverImageUrl,
        category: membership.group.category,
        regionKey: membership.group.regionKey,
        regionLabel: membership.group.region?.label ?? null,
        countryCode: membership.group.countryCode,
        isPublic: membership.group.isPublic,
        role: membership.role,
        memberCount: membership.group._count.members,
        publicPath: `/grupos/${membership.group.slug}`,
      })),
      businesses,
      events,
      posts,
    },
  });
}
