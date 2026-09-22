import { CommunityGroupMemberRole, CommunityGroupMembershipStatus, CommunityPostStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { communityPostSchema } from '@/lib/validators';
import { getCommunityPostsPage } from '@/lib/server/community-posts';

const DAILY_POST_LIMIT = 3;
export async function GET(request: Request) {
  const session = await getServerAuthSession();
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId');
  const groupId = searchParams.get('groupId');
  const regionKey = searchParams.get('region') ?? (businessId || groupId ? undefined : session?.user?.regionKey);
  const manageBusiness = searchParams.get('manage') === '1';
  const canManageBusiness = manageBusiness && businessId && session?.user?.id
    ? Boolean(await prisma.business.findFirst({
        where: {
          id: businessId,
          OR: [
            { createdById: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
        select: { id: true },
      })) || session.user.role === 'ADMIN'
    : false;
  const group = groupId ? await prisma.communityGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true, isPublic: true,
      members: session?.user?.id ? { where: { userId: session.user.id }, take: 1, select: { role: true, status: true } } : false,
    },
  }) : null;
  if (groupId && !group) return NextResponse.json({ error: 'Grupo não encontrado.' }, { status: 404 });
  const groupMembership = group?.members?.[0];
  const canViewGroup = Boolean(group?.isPublic || session?.user?.role === 'ADMIN' || groupMembership?.status === CommunityGroupMembershipStatus.APPROVED);
  if (group && !canViewGroup) return NextResponse.json({ error: 'Este conteúdo é restrito aos membros aprovados.' }, { status: 403 });
  const canManageGroup = Boolean(session?.user?.role === 'ADMIN' || (groupMembership?.status === CommunityGroupMembershipStatus.APPROVED && (groupMembership.role === CommunityGroupMemberRole.OWNER || groupMembership.role === CommunityGroupMemberRole.ADMIN)));
  const page = await getCommunityPostsPage({
    session,
    regionKey,
    businessId,
    groupId,
    includeBusinessPending: canManageBusiness,
    canManageGroup,
    limit: Number(searchParams.get('limit') ?? 20),
    offset: Number(searchParams.get('offset') ?? 0),
    cursor: searchParams.get('cursor'),
  });

  return NextResponse.json(page);
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    scope: 'community:post',
    key: getRateLimitKey(request, session.user.id),
    max: 6,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Publicacoes demais em pouco tempo. Tente novamente mais tarde.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  if (!session.user.onboardingCompleted || !session.user.regionKey || !session.user.locationLabel) {
    return NextResponse.json(
      { error: 'Complete your profile before posting' },
      { status: 400 },
    );
  }

  const body = await request.json();
  const parsed = communityPostSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid post data' },
      { status: 400 },
    );
  }

  const professionalBusiness =
    parsed.data.personaMode === 'professional'
      ? await prisma.business.findFirst({
          where: {
            id: parsed.data.businessId || '__missing-business__',
            OR: [
              { createdById: session.user.id },
              { members: { some: { userId: session.user.id } } },
            ],
          },
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            regionKey: true,
            locationLabel: true,
          },
        })
      : null;

  const targetGroup = parsed.data.groupId
    ? await prisma.communityGroup.findUnique({
        where: { id: parsed.data.groupId },
        select: {
          id: true, regionKey: true, region: { select: { label: true } },
          members: { where: { userId: session.user.id, status: CommunityGroupMembershipStatus.APPROVED }, take: 1, select: { id: true } },
        },
      })
    : null;

  if (parsed.data.groupId && (!targetGroup || targetGroup.members.length === 0)) {
    return NextResponse.json({ error: 'Apenas membros aprovados podem publicar neste grupo.' }, { status: 403 });
  }

  if (parsed.data.personaMode === 'professional' && !professionalBusiness) {
    return NextResponse.json(
      { error: 'Selecione um perfil profissional valido para publicar como pagina.' },
      { status: 403 },
    );
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const postsToday = await prisma.communityPost.count({
    where: {
      authorId: session.user.id,
      createdAt: {
        gte: startOfDay,
      },
    },
  });

  if (postsToday >= DAILY_POST_LIMIT) {
    return NextResponse.json(
      { error: `Daily limit reached (${DAILY_POST_LIMIT} posts)` },
      { status: 429 },
    );
  }

  const hasExternalLink = Boolean(parsed.data.externalUrl);

  const post = await prisma.communityPost.create({
    data: {
      content: parsed.data.content,
      imageUrl: parsed.data.imageUrl,
      externalUrl: parsed.data.externalUrl ?? null,
      status: hasExternalLink ? CommunityPostStatus.PENDING_REVIEW : CommunityPostStatus.PUBLISHED,
      authorId: session.user.id,
      businessAuthorId: professionalBusiness?.id ?? null,
      groupId: targetGroup?.id ?? null,
      regionKey: targetGroup?.regionKey ?? professionalBusiness?.regionKey ?? session.user.regionKey,
      locationLabel: targetGroup?.region?.label ?? professionalBusiness?.locationLabel ?? session.user.locationLabel,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          locationLabel: true,
        },
      },
      businessAuthor: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          locationLabel: true,
        },
      },
    },
  });
  const displayAuthor = post.businessAuthor
    ? {
        id: post.businessAuthor.id,
        name: post.businessAuthor.name,
        username: null,
        image: post.businessAuthor.imageUrl,
        locationLabel: post.businessAuthor.locationLabel,
      }
    : post.author;

  return NextResponse.json({
    post: {
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl,
      externalUrl: post.externalUrl,
      status: post.status,
      createdAt: post.createdAt,
      locationLabel: post.locationLabel,
      author: displayAuthor,
      authorHref: post.businessAuthor
        ? `/negocios/${post.businessAuthor.slug || post.businessAuthor.id}`
        : post.author.username
          ? `/${post.author.username}`
          : undefined,
      authorType: post.businessAuthor ? 'BUSINESS' : 'USER',
      comments: [],
      likeCount: 0,
      commentCount: 0,
      viewerHasLiked: false,
      likedBy: [],
      canEdit: true,
      canDelete: true,
    },
    message:
      post.status === CommunityPostStatus.PUBLISHED
        ? 'Post published'
        : 'Post sent for moderation',
  });
}
