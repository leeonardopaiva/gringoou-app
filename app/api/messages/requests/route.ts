import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listBlockedIds } from '@/lib/server/blocks';

/** Solicitações de mensagem recebidas (de quem a pessoa não aceita receber direto) para os Alertas. */
export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const viewerId = session.user.id;

  const [rows, blocked] = await Promise.all([
    prisma.marketplaceConversation.findMany({
      where: {
        sellerId: viewerId,
        itemId: null,
        requestStatus: 'PENDING',
        messages: { some: {} },
        NOT: { states: { some: { userId: viewerId, deletedAt: { not: null } } } },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 20,
      select: {
        id: true,
        buyer: { select: { id: true, name: true, username: true, image: true } },
        messages: { take: 1, orderBy: { createdAt: 'desc' }, select: { content: true, createdAt: true } },
      },
    }),
    listBlockedIds(viewerId),
  ]);

  const requests = rows
    .filter((row) => !blocked.has(row.buyer.id))
    .map((row) => ({
      id: row.id,
      sender: row.buyer,
      preview: row.messages[0]?.content.slice(0, 140) ?? '',
      createdAt: row.messages[0]?.createdAt ?? null,
    }));

  return NextResponse.json({ requests });
}
