import { BusinessStatus, EventStatus } from '@prisma/client';
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
      locationLabel: true,
      createdAt: true,
    },
  });

  if (!user?.username) {
    return NextResponse.json({ error: 'Perfil profissional não encontrado.' }, { status: 404 });
  }

  const businessVisibilityWhere = {
    createdById: user.id,
    status: BusinessStatus.PUBLISHED,
    ...getVisibilityFilter(session?.user?.regionKey),
  };

  const eventVisibilityWhere = {
    createdById: user.id,
    status: EventStatus.PUBLISHED,
    ...getVisibilityFilter(session?.user?.regionKey),
  };

  const [businesses, events, businessCount, eventCount] = await Promise.all([
    prisma.business.findMany({
      where: businessVisibilityWhere,
      orderBy: [{ createdAt: 'desc' }],
      take: 12,
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
      where: eventVisibilityWhere,
      orderBy: [{ startsAt: 'asc' }],
      take: 12,
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
    prisma.business.count({ where: businessVisibilityWhere }),
    prisma.event.count({ where: eventVisibilityWhere }),
  ]);

  if (businessCount === 0 && eventCount === 0) {
    return NextResponse.json(
      { error: 'Este perfil ainda não possui uma vitrine profissional pública.' },
      { status: 404 },
    );
  }

  const headline =
    user.bio ||
    (user.locationLabel
      ? `Vitrine profissional com negócios e eventos em ${user.locationLabel}.`
      : 'Vitrine profissional com negócios e eventos da comunidade.');

  return NextResponse.json({
    profile: {
      id: user.id,
      name: user.name || 'Perfil profissional',
      username: user.username,
      image: user.image,
      coverImageUrl: user.coverImageUrl,
      locationLabel: user.locationLabel,
      joinedAt: user.createdAt,
      personalPublicPath: `/${user.username}`,
      professionalPublicPath: `/profissional/${user.username}`,
      headline,
      stats: {
        businessCount,
        eventCount,
      },
      businesses,
      events,
    },
  });
}
