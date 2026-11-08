import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ conversationId: string }> };

/** Responde a uma solicitação de mensagem: aceitar, excluir ou bloquear a pessoa. */
export async function POST(request: Request, { params }: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const viewerId = session.user.id;
  const { conversationId } = await params;

  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== 'accept' && action !== 'delete' && action !== 'block') {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  }

  const conversation = await prisma.marketplaceConversation.findFirst({
    where: { id: conversationId, sellerId: viewerId, itemId: null, requestStatus: 'PENDING' },
    select: { id: true, buyerId: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 });
  }

  if (action === 'accept') {
    await prisma.marketplaceConversation.update({ where: { id: conversationId }, data: { requestStatus: 'ACCEPTED' } });
    return NextResponse.json({ ok: true, message: 'Conversa aceita.' });
  }

  // Excluir ou bloquear: some para quem recebeu e novas mensagens não reaparecem (a conversa segue pendente).
  await prisma.conversationState.upsert({
    where: { conversationId_userId: { conversationId, userId: viewerId } },
    create: { conversationId, userId: viewerId, deletedAt: new Date() },
    update: { deletedAt: new Date() },
  });

  if (action === 'block') {
    await prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: viewerId, blockedId: conversation.buyerId } },
      create: { blockerId: viewerId, blockedId: conversation.buyerId },
      update: {},
    });
    return NextResponse.json({ ok: true, message: 'Pessoa bloqueada.' });
  }

  return NextResponse.json({ ok: true, message: 'Mensagem excluída.' });
}
