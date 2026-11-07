import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit } from '@/lib/rate-limit';

const MAX_MESSAGE_LENGTH = 2000;

/** Busca as conversas do usuário logado. */
export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const conversations = await prisma.marketplaceConversation.findMany({
    where: {
      // Quem iniciou sempre vê a conversa; o destinatário só a vê depois da primeira mensagem
      // (evita que "Enviar mensagem" sem texto crie conversas vazias na caixa de outra pessoa).
      OR: [
        { buyerId: userId },
        { sellerId: userId, messages: { some: {} } },
      ],
      status: 'ACTIVE',
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      itemId: true,
      lastMessageAt: true,
      createdAt: true,
      updatedAt: true,
      item: {
        select: { id: true, title: true, imageUrl: true, priceCents: true, isFree: true },
      },
      buyer: { select: { id: true, name: true, image: true, username: true } },
      seller: { select: { id: true, name: true, image: true, username: true } },
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { id: true, content: true, senderId: true, createdAt: true },
      },
    },
  });

  // Adiciona publicPath derivado
  const result = conversations.map((conv) => ({
    ...conv,
    // Conversas diretas entre pessoas não têm anúncio (item = null).
    item: conv.item ? { ...conv.item, publicPath: `/marketplace/${conv.item.id}` } : null,
  }));

  return NextResponse.json({ conversations: result });
}

/** Cria uma nova conversa (envia a primeira mensagem). */
export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const viewerId = session.user.id;

  const body = await request.json().catch(() => null);
  const content = typeof body?.content === 'string' ? body.content.trim().slice(0, MAX_MESSAGE_LENGTH) : '';

  // Conversa direta entre pessoas (botão "Enviar mensagem" no perfil público).
  if (typeof body?.recipientId === 'string' && body.recipientId) {
    if (body.recipientId === viewerId) {
      return NextResponse.json({ error: 'Você não pode enviar mensagem para você mesmo.' }, { status: 400 });
    }

    const rateLimit = await consumeRateLimit({
      scope: 'messages:start-direct',
      key: `user:${viewerId}`,
      max: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Muitas conversas novas em pouco tempo. Tente novamente mais tarde.' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit) },
      );
    }

    const recipient = await prisma.user.findUnique({ where: { id: body.recipientId }, select: { id: true } });
    if (!recipient) {
      return NextResponse.json({ error: 'Pessoa não encontrada.' }, { status: 404 });
    }

    const existingDirect = await prisma.marketplaceConversation.findFirst({
      where: {
        itemId: null,
        OR: [
          { buyerId: viewerId, sellerId: recipient.id },
          { buyerId: recipient.id, sellerId: viewerId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (existingDirect) {
      if (content) {
        await prisma.marketplaceConversation.update({
          where: { id: existingDirect.id },
          data: { lastMessageAt: new Date(), status: 'ACTIVE', messages: { create: { senderId: viewerId, content } } },
        });
      }
      return NextResponse.json({ conversationId: existingDirect.id, existing: true });
    }

    const direct = await prisma.marketplaceConversation.create({
      data: {
        buyerId: viewerId,
        sellerId: recipient.id,
        ...(content ? { lastMessageAt: new Date(), messages: { create: { senderId: viewerId, content } } } : {}),
      },
      select: { id: true },
    });
    return NextResponse.json({ conversationId: direct.id, message: 'Conversa iniciada.' });
  }

  if (!body?.itemId || !content) {
    return NextResponse.json({ error: 'Informe o anúncio e a mensagem.' }, { status: 400 });
  }

  // Busca o item para obter o vendedor
  const item = await prisma.marketplaceItem.findUnique({
    where: { id: body.itemId },
    select: { id: true, createdById: true, title: true, status: true },
  });

  if (!item) {
    return NextResponse.json({ error: 'Anúncio não encontrado.' }, { status: 404 });
  }
  if (item.createdById === viewerId) {
    return NextResponse.json({ error: 'Você não pode iniciar uma conversa com você mesmo.' }, { status: 400 });
  }

  // Verifica se já existe conversa
  const existing = await prisma.marketplaceConversation.findUnique({
    where: { itemId_buyerId: { itemId: body.itemId, buyerId: viewerId } },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: 'Você já tem uma conversa sobre este anúncio.', conversationId: existing.id }, { status: 409 });
  }

  // Cria conversa e primeira mensagem
  const now = new Date();
  const conversation = await prisma.marketplaceConversation.create({
    data: {
      itemId: body.itemId,
      buyerId: viewerId,
      sellerId: item.createdById,
      messages: {
        create: {
          senderId: viewerId,
          content,
        },
      },
      lastMessageAt: now,
    },
    select: { id: true },
  });

  return NextResponse.json({ conversationId: conversation.id, message: 'Conversa iniciada.' });
}