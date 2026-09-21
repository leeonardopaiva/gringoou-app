import { CommunityGroupReportReason } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({ reason: z.nativeEnum(CommunityGroupReportReason) });
type Context = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: Context) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Entre na sua conta para denunciar.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Selecione um motivo válido.' }, { status: 400 });
  const { slug } = await context.params;
  const group = await prisma.communityGroup.findUnique({ where: { slug }, select: { id: true, createdById: true } });
  if (!group) return NextResponse.json({ error: 'Grupo não encontrado.' }, { status: 404 });
  if (group.createdById === session.user.id) return NextResponse.json({ error: 'Você não pode denunciar o próprio grupo.' }, { status: 400 });
  await prisma.communityGroupReport.upsert({
    where: { groupId_reporterId: { groupId: group.id, reporterId: session.user.id } },
    create: { groupId: group.id, reporterId: session.user.id, reason: parsed.data.reason },
    update: { reason: parsed.data.reason, status: 'PENDING', reviewedAt: null, reviewedById: null },
  });
  return NextResponse.json({ message: 'Denúncia enviada para moderação.' }, { status: 201 });
}
