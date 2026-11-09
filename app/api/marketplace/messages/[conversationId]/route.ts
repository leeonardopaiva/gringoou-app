import { NextResponse } from 'next/server';
import { notifyBusinessMessage } from '@/lib/ads/notifications';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { publishNewMessage } from '@/lib/ably';
import { isBlockedBetween } from '@/lib/server/blocks';
import { reviveConversationFor } from '@/lib/server/message-access';

/** Enquanto a pessoa não aceita, quem escreveu primeiro pode mandar poucas mensagens. */
const PENDING_MESSAGE_CAP = 3;
/** Prazo para apagar a própria mensagem. */
const DELETE_WINDOW_MS = 15 * 60 * 1000;

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
      deletedAt: true,
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json({
    messages: messages.map(({ deletedAt, ...message }) => (deletedAt ? { ...message, content: '', deleted: true } : { ...message, deleted: false })),
    itemId: conversation.itemId,
  });
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
    select: { id: true, buyerId: true, sellerId: true, requestStatus: true },
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

  // Solicitação pendente: quem escreveu primeiro tem poucas mensagens; responder significa aceitar.
  let requestStatus = conversation.requestStatus;
  if (requestStatus === 'PENDING') {
    if (conversation.sellerId === viewerId) {
      await prisma.marketplaceConversation.update({ where: { id: conversationId }, data: { requestStatus: 'ACCEPTED' } });
      await reviveConversationFor(conversationId, viewerId);
      requestStatus = 'ACCEPTED';
    } else {
      const sent = await prisma.marketplaceMessage.count({ where: { conversationId, senderId: viewerId } });
      if (sent >= PENDING_MESSAGE_CAP) {
        return NextResponse.json({ error: 'Aguarde a resposta desta pessoa para continuar a conversa.' }, { status: 429 });
      }
    }
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

  void notifyBusinessMessage(conversationId, viewerId, message.content);

  // Atualiza lastMessageAt
  await prisma.marketplaceConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  // Mensagem nova faz a conversa voltar à lista de quem a tinha arquivado ou excluído
  // (solicitação ainda não aceita continua fora da lista).
  if (requestStatus === 'ACCEPTED') await reviveConversationFor(conversationId, otherId);

  // Publica em tempo real via Ably (dispara e esquece)
  void publishNewMessage(conversationId, {
    type: 'new-message',
    data: message as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ message });
}

const STATE_ACTIONS = {
  archive: { archivedAt: () => new Date() },
  unarchive: { archivedAt: () => null },
  mute: { mutedAt: () => new Date() },
  unmute: { mutedAt: () => null },
  delete: { deletedAt: () => new Date() },
} as const;

/** Arquivar, silenciar ou excluir a conversa só para a pessoa logada. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { conversationId } = await params;
  const viewerId = session.user.id;

  const body = await request.json().catch(() => null);
  const action = typeof body?.action === 'string' ? (body.action as keyof typeof STATE_ACTIONS) : null;
  if (!action || !(action in STATE_ACTIONS)) {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  }

  const conversation = await prisma.marketplaceConversation.findUnique({
    where: { id: conversationId },
    select: { buyerId: true, sellerId: true },
  });
  if (!conversation || (conversation.buyerId !== viewerId && conversation.sellerId !== viewerId)) {
    return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });
  }

  const data = Object.fromEntries(Object.entries(STATE_ACTIONS[action]).map(([key, make]) => [key, make()]));
  await prisma.conversationState.upsert({
    where: { conversationId_userId: { conversationId, userId: viewerId } },
    create: { conversationId, userId: viewerId, ...data },
    update: data,
  });

  return NextResponse.json({ ok: true });
}

/** Apaga uma mensagem própria (dentro do prazo). O texto some, mas o registro fica para a moderação. */
export async function DELETE(request: Request, { params }: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { conversationId } = await params;
  const viewerId = session.user.id;
  const messageId = new URL(request.url).searchParams.get('messageId');
  if (!messageId) {
    return NextResponse.json({ error: 'Informe a mensagem.' }, { status: 400 });
  }

  const message = await prisma.marketplaceMessage.findFirst({
    where: { id: messageId, conversationId, senderId: viewerId },
    select: { id: true, createdAt: true },
  });
  if (!message) {
    return NextResponse.json({ error: 'Mensagem não encontrada.' }, { status: 404 });
  }
  if (Date.now() - message.createdAt.getTime() > DELETE_WINDOW_MS) {
    return NextResponse.json({ error: 'O prazo para apagar esta mensagem terminou.' }, { status: 400 });
  }

  await prisma.marketplaceMessage.update({ where: { id: message.id }, data: { deletedAt: new Date() } });
  void publishNewMessage(conversationId, { type: 'message-deleted', data: { id: message.id } });
  return NextResponse.json({ ok: true });
}
