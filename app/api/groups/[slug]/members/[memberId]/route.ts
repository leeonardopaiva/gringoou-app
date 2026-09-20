import { CommunityGroupMemberRole, CommunityGroupMembershipStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { communityGroupMemberActionSchema } from '@/lib/validators';

type RouteContext = { params: Promise<{ slug: string; memberId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { slug, memberId } = await context.params;
  const parsed = communityGroupMemberActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Ação inválida.' }, { status: 400 });

  const group = await prisma.communityGroup.findUnique({ where: { slug }, select: { id: true } });
  if (!group) return NextResponse.json({ error: 'Grupo não encontrado.' }, { status: 404 });
  const [actor, target] = await Promise.all([
    prisma.communityGroupMember.findUnique({ where: { groupId_userId: { groupId: group.id, userId: session.user.id } }, select: { role: true, status: true } }),
    prisma.communityGroupMember.findFirst({ where: { id: memberId, groupId: group.id }, select: { id: true, userId: true, role: true } }),
  ]);
  if (!target) return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 });
  const platformAdmin = session.user.role === 'ADMIN';
  const actorCanManage = platformAdmin || (actor?.status === CommunityGroupMembershipStatus.APPROVED && (actor.role === CommunityGroupMemberRole.OWNER || actor.role === CommunityGroupMemberRole.ADMIN));
  if (!actorCanManage) return NextResponse.json({ error: 'Sem permissão para moderar membros.' }, { status: 403 });
  const actorIsOwner = platformAdmin || actor?.role === CommunityGroupMemberRole.OWNER;
  if (target.role === CommunityGroupMemberRole.OWNER && !platformAdmin) return NextResponse.json({ error: 'O proprietário do grupo não pode ser alterado.' }, { status: 403 });
  if (target.role === CommunityGroupMemberRole.ADMIN && !actorIsOwner) return NextResponse.json({ error: 'Somente o proprietário pode gerenciar administradores.' }, { status: 403 });
  if (['promote', 'demote'].includes(parsed.data.action) && !actorIsOwner) return NextResponse.json({ error: 'Somente o proprietário pode alterar administradores.' }, { status: 403 });

  if (parsed.data.action === 'remove') {
    await prisma.communityGroupMember.delete({ where: { id: target.id } });
    return NextResponse.json({ message: 'Membro removido.' });
  }
  const data = parsed.data.action === 'approve'
    ? { status: CommunityGroupMembershipStatus.APPROVED }
    : parsed.data.action === 'block'
      ? { status: CommunityGroupMembershipStatus.BLOCKED }
      : parsed.data.action === 'promote'
        ? { role: CommunityGroupMemberRole.ADMIN, status: CommunityGroupMembershipStatus.APPROVED }
        : { role: CommunityGroupMemberRole.MEMBER };
  const membership = await prisma.communityGroupMember.update({ where: { id: target.id }, data, select: { id: true, role: true, status: true } });
  return NextResponse.json({ membership, message: 'Participação atualizada.' });
}
