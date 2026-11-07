import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit } from '@/lib/rate-limit';

const bodySchema = z.object({
  conversationId: z.string().min(1).max(64),
  reason: z.enum(['SPAM', 'HARASSMENT', 'SCAM', 'INAPPROPRIATE', 'OTHER']),
  details: z.string().trim().max(500).optional(),
});

/** Denuncia a outra pessoa de uma conversa em que o usuário participa. */
export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const viewerId = session.user.id;

  const rateLimit = await consumeRateLimit({ scope: 'reports:messages', key: `user:${viewerId}`, max: 10, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Muitas denúncias em pouco tempo. Tente mais tarde.' }, { status: 429, headers: buildRateLimitHeaders(rateLimit) });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Informe o motivo da denúncia.' }, { status: 400 });

  const conversation = await prisma.marketplaceConversation.findUnique({
    where: { id: parsed.data.conversationId },
    select: { id: true, buyerId: true, sellerId: true },
  });
  if (!conversation || (conversation.buyerId !== viewerId && conversation.sellerId !== viewerId)) {
    return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });
  }

  const reportedUserId = conversation.buyerId === viewerId ? conversation.sellerId : conversation.buyerId;

  // Uma denúncia pendente por conversa e pessoa: evita duplicar a fila da moderação.
  const pending = await prisma.messageReport.findFirst({
    where: { conversationId: conversation.id, reporterId: viewerId, status: 'PENDING' },
    select: { id: true },
  });
  if (!pending) {
    await prisma.messageReport.create({
      data: {
        conversationId: conversation.id,
        reporterId: viewerId,
        reportedUserId,
        reason: parsed.data.reason,
        details: parsed.data.details || null,
      },
    });
  }
  return NextResponse.json({ reported: true });
}
