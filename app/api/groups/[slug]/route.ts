import { CommunityGroupMemberRole, CommunityGroupMembershipStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findRegionByKey } from '@/lib/region-store';
import { communityGroupSchema } from '@/lib/validators';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  const { slug } = await context.params;
  const group = await prisma.communityGroup.findUnique({
    where: { slug },
    select: {
      id: true, name: true, slug: true, description: true, imageUrl: true, coverImageUrl: true,
      category: true, regionKey: true, countryCode: true, isPublic: true, createdAt: true, createdById: true,
      region: { select: { label: true } },
      members: {
        orderBy: [{ createdAt: 'asc' }], take: 100,
        select: { id: true, role: true, status: true, createdAt: true, user: { select: { id: true, name: true, username: true, image: true, locationLabel: true, emailVerified: true, recruiterVerified: true } } },
      },
      _count: { select: { members: { where: { status: CommunityGroupMembershipStatus.APPROVED } }, posts: { where: { status: 'PUBLISHED' } } } },
    },
  });
  if (!group) return NextResponse.json({ error: 'Grupo não encontrado.' }, { status: 404 });

  const viewerMembership = session?.user?.id
    ? await prisma.communityGroupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
        select: { id: true, role: true, status: true, createdAt: true },
      })
    : null;
  const isPlatformAdmin = session?.user?.role === 'ADMIN';
  const canViewContent = group.isPublic || isPlatformAdmin || viewerMembership?.status === CommunityGroupMembershipStatus.APPROVED;
  const canManage = isPlatformAdmin || (viewerMembership?.status === CommunityGroupMembershipStatus.APPROVED && (viewerMembership.role === CommunityGroupMemberRole.OWNER || viewerMembership.role === CommunityGroupMemberRole.ADMIN));
  const canManageAdmins = isPlatformAdmin || (viewerMembership?.status === CommunityGroupMembershipStatus.APPROVED && viewerMembership.role === CommunityGroupMemberRole.OWNER);

  return NextResponse.json({
    group: {
      id: group.id, name: group.name, slug: group.slug, description: group.description, imageUrl: group.imageUrl,
      coverImageUrl: group.coverImageUrl, category: group.category, regionKey: group.regionKey,
      regionLabel: group.region?.label ?? null, countryCode: group.countryCode, isPublic: group.isPublic,
      createdAt: group.createdAt, memberCount: group._count.members, postCount: group._count.posts,
      publicPath: `/grupos/${group.slug}`, canViewContent, canManage, canManageAdmins,
      viewerMembership: viewerMembership ? { id: viewerMembership.id, role: viewerMembership.role, status: viewerMembership.status } : null,
      members: canViewContent ? group.members.filter((member) => canManage || member.status === CommunityGroupMembershipStatus.APPROVED).map((member) => ({ id: member.id, role: member.role, status: member.status, joinedAt: member.createdAt, user: { id: member.user.id, name: member.user.name, username: member.user.username, image: member.user.image, locationLabel: member.user.locationLabel, verified: Boolean(member.user.emailVerified || member.user.recruiterVerified) } })) : [],
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { slug } = await context.params;
  const membership = await prisma.communityGroupMember.findFirst({
    where: { group: { slug }, userId: session.user.id, status: CommunityGroupMembershipStatus.APPROVED, role: { in: [CommunityGroupMemberRole.OWNER, CommunityGroupMemberRole.ADMIN] } },
    select: { groupId: true },
  });
  const group = await prisma.communityGroup.findUnique({ where: { slug }, select: { id: true } });
  if (!group) return NextResponse.json({ error: 'Grupo não encontrado.' }, { status: 404 });
  if (!membership && session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão para editar este grupo.' }, { status: 403 });

  const parsed = communityGroupSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dados inválidos.' }, { status: 400 });
  const region = parsed.data.regionKey ? await findRegionByKey(parsed.data.regionKey, { activeOnly: true }) : null;
  if (parsed.data.regionKey && !region) return NextResponse.json({ error: 'Selecione uma região válida.' }, { status: 400 });

  const updated = await prisma.communityGroup.update({
    where: { id: group.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description ?? null } : {}),
      ...(parsed.data.category !== undefined ? { category: parsed.data.category ?? null } : {}),
      ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl ?? null } : {}),
      ...(parsed.data.coverImageUrl !== undefined ? { coverImageUrl: parsed.data.coverImageUrl ?? null } : {}),
      ...(parsed.data.regionKey !== undefined ? { regionKey: region?.key ?? null } : {}),
      ...(parsed.data.countryCode !== undefined || region ? { countryCode: region?.countryCode ?? parsed.data.countryCode } : {}),
      ...(parsed.data.isPublic !== undefined ? { isPublic: parsed.data.isPublic } : {}),
    },
    select: { id: true, name: true, slug: true, imageUrl: true, coverImageUrl: true, isPublic: true, countryCode: true, regionKey: true, updatedAt: true },
  });
  return NextResponse.json({ group: updated, message: 'Grupo atualizado.' });
}
