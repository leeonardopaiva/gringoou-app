import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** Busca as conversas do usuário logado. */
export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const conversations = await prisma.marketplaceConversation.findMany({
    where: {
      OR: [
        { buyerId: userId },
        { sellerId: userId },
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
    item: { ...conv.item, publicPath: `/marketplace/${conv.item.id}` },
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
  if (!body?.itemId || !body?.content?.trim()) {
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
          content: body.content.trim(),
        },
      },
      lastMessageAt: now,
    },
    select: { id: true },
  });

  return NextResponse.json({ conversationId: conversation.id, message: 'Conversa iniciada.' });
}