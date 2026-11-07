import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { publishNewMessage } from '@/lib/ably';
import { isBlockedBetween } from '@/lib/server/blocks';

type RouteContext = { params: Promise<{ conversationId: string }> };

/** Busca as mensagens de uma conversa (e marca como lidas para o viewer). */
export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { conversationId } = await params;
  const viewerId = session.user.id;

  // Verifica se o viewer é participante
  const conversation = await prisma.marketplaceConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, buyerId: true, sellerId: true, itemId: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });
  }
  if (conversation.buyerId !== viewerId && conversation.sellerId !== viewerId) {
    return NextResponse.json({ error: 'Você não participa desta conversa.' }, { status: 403 });
  }

  // Marca mensagens não lidas como lidas (se o viewer é o destinatário)
  await prisma.marketplaceMessage.updateMany({
    where: {
      conversationId,
      senderId: { not: viewerId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const messages = await prisma.marketplaceMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      senderId: true,
      content: true,
      readAt: true,
      createdAt: true,
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json({ messages, itemId: conversation.itemId });
}

/** Envia uma nova mensagem na conversa (e publica via Ably). */
export async function POST(request: Request, { params }: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { conversationId } = await params;
  const viewerId = session.user.id;

  const body = await request.json().catch(() => null);
  if (!body?.content?.trim()) {
    return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });
  }

  // Valida participação
  const conversation = await prisma.marketplaceConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, buyerId: true, sellerId: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });
  }
  if (conversation.buyerId !== viewerId && conversation.sellerId !== viewerId) {
    return NextResponse.json({ error: 'Você não participa desta conversa.' }, { status: 403 });
  }

  // Bloqueio entre as duas pessoas (em qualquer direção) impede novas mensagens.
  const otherId = conversation.buyerId === viewerId ? conversation.sellerId : conversation.buyerId;
  if (await isBlockedBetween(viewerId, otherId)) {
    return NextResponse.json({ error: 'Não é possível enviar mensagem para esta pessoa.' }, { status: 403 });
  }

  // Cria mensagem
  const message = await prisma.marketplaceMessage.create({
    data: {
      conversationId,
      senderId: viewerId,
      content: body.content.trim().slice(0, 2000),
    },
    select: {
      id: true,
      senderId: true,
      content: true,
      readAt: true,
      createdAt: true,
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  // Atualiza lastMessageAt
  await prisma.marketplaceConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  // Publica em tempo real via Ably (dispara e esquece)
  void publishNewMessage(conversationId, {
    type: 'new-message',
    data: message as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ message });
}