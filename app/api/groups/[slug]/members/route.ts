import { CommunityGroupMemberRole, CommunityGroupMembershipStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { slug } = await context.params;
  const group = await prisma.communityGroup.findUnique({ where: { slug }, select: { id: true, isPublic: true } });
  if (!group) return NextResponse.json({ error: 'Grupo não encontrado.' }, { status: 404 });

  const current = await prisma.communityGroupMember.findUnique({ where: { groupId_userId: { groupId: group.id, userId: session.user.id } }, select: { id: true, status: true } });
  if (current?.status === CommunityGroupMembershipStatus.BLOCKED) return NextResponse.json({ error: 'Sua participação neste grupo está bloqueada.' }, { status: 403 });
  const status = group.isPublic ? CommunityGroupMembershipStatus.APPROVED : CommunityGroupMembershipStatus.PENDING;
  const membership = await prisma.communityGroupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
    update: { status },
    create: { groupId: group.id, userId: session.user.id, role: CommunityGroupMemberRole.MEMBER, status },
    select: { id: true, role: true, status: true },
  });
  return NextResponse.json({ membership, message: status === CommunityGroupMembershipStatus.APPROVED ? 'Você entrou no grupo.' : 'Solicitação enviada para aprovação.' });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { slug } = await context.params;
  const group = await prisma.communityGroup.findUnique({ where: { slug }, select: { id: true, createdById: true } });
  if (!group) return NextResponse.json({ error: 'Grupo não encontrado.' }, { status: 404 });
  if (group.createdById === session.user.id) return NextResponse.json({ error: 'O dono do grupo não pode sair.' }, { status: 400 });
  const membership = await prisma.communityGroupMember.findUnique({ where: { groupId_userId: { groupId: group.id, userId: session.user.id } }, select: { status: true } });
  if (membership?.status === CommunityGroupMembershipStatus.BLOCKED) return NextResponse.json({ error: 'Participação bloqueada. Fale com um administrador do grupo.' }, { status: 403 });
  await prisma.communityGroupMember.deleteMany({ where: { groupId: group.id, userId: session.user.id } });
  return NextResponse.json({ message: 'Você saiu do grupo.' });
}
