import { CommunityGroupMemberRole, CommunityGroupMembershipStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findRegionByKey } from '@/lib/region-store';
import { uniqueSlug } from '@/lib/slug';
import { communityGroupSchema } from '@/lib/validators';

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim();
  const region = searchParams.get('region')?.trim();
  const country = searchParams.get('country')?.trim().toUpperCase();
  const rawLimit = Number(searchParams.get('limit') ?? 24);
  const rawOffset = Number(searchParams.get('offset') ?? 0);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 24) : 24;
  const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;

  const baseWhere: Prisma.CommunityGroupWhereInput = {
    AND: [
      {
        OR: [
          { isPublic: true },
          ...(session?.user?.id
            ? [{ members: { some: { userId: session.user.id, status: { in: [CommunityGroupMembershipStatus.APPROVED, CommunityGroupMembershipStatus.PENDING] } } } }]
            : []),
        ],
      },
      ...(search
        ? [{
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { category: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }]
        : []),
    ],
  };

  const groupSelect = {
    id: true,
    name: true,
    slug: true,
    description: true,
    imageUrl: true,
    coverImageUrl: true,
    category: true,
    countryCode: true,
    isPublic: true,
    regionKey: true,
    createdAt: true,
    region: {
      select: {
        label: true,
      },
    },
    _count: {
      select: {
        members: { where: { status: CommunityGroupMembershipStatus.APPROVED } },
      },
    },
    members: {
      where: { status: CommunityGroupMembershipStatus.APPROVED },
      orderBy: {
        createdAt: 'desc' as const,
      },
      take: 4,
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            locationLabel: true,
          },
        },
      },
    },
  } as const;

  const groups = await prisma.communityGroup.findMany({
    where: {
      ...baseWhere,
      ...(region
        ? {
            regionKey: region,
          }
        : {}),
      ...(country ? { countryCode: country } : {}),
    },
    orderBy: [{ createdAt: 'desc' }],
    take: limit + 1,
    skip: offset,
    select: groupSelect,
  });

  const hasMore = groups.length > limit;
  const pageGroups = hasMore ? groups.slice(0, limit) : groups;

  return NextResponse.json({
    groups: pageGroups.map((group) => ({
      id: group.id,
      name: group.name,
      slug: group.slug,
      description: group.description,
      imageUrl: group.imageUrl,
      coverImageUrl: group.coverImageUrl,
      category: group.category,
      countryCode: group.countryCode,
      isPublic: group.isPublic,
      regionKey: group.regionKey,
      regionLabel: group.region?.label ?? null,
      memberCount: group._count.members,
      createdAt: group.createdAt,
      memberPreviews: group.members.map((membership) => ({
        id: membership.user.id,
        name: membership.user.name,
        username: membership.user.username,
        image: membership.user.image,
        locationLabel: membership.user.locationLabel,
      })),
      publicPath: `/grupos/${group.slug}`,
    })),
    hasMore,
    nextOffset: offset + pageGroups.length,
  });
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.onboardingCompleted) {
    return NextResponse.json({ error: 'Complete seu perfil antes de criar um grupo.' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = communityGroupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados invalidos do grupo.' },
      { status: 400 },
    );
  }

  const region = parsed.data.regionKey
    ? await findRegionByKey(parsed.data.regionKey, { activeOnly: true })
    : null;

  if (parsed.data.regionKey && !region) {
    return NextResponse.json({ error: 'Selecione uma regiao valida.' }, { status: 400 });
  }

  // Mantém a URL legível, mas inclui um código estável para impedir colisões
  // mesmo quando grupos com o mesmo nome são criados simultaneamente.
  const slug = uniqueSlug(parsed.data.name);

  const group = await prisma.communityGroup.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl,
      coverImageUrl: parsed.data.coverImageUrl,
      category: parsed.data.category,
      regionKey: region?.key,
      countryCode: region?.countryCode ?? parsed.data.countryCode,
      isPublic: parsed.data.isPublic,
      createdById: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: CommunityGroupMemberRole.OWNER,
          status: CommunityGroupMembershipStatus.APPROVED,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  return NextResponse.json({
    group: {
      ...group,
      publicPath: `/grupos/${group.slug}`,
    },
    message: 'Grupo criado.',
  });
}
