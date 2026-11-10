import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ROWS = 5000;

/**
 * Exportação dos dados pessoais do próprio usuário (LGPD, art. 18, V — portabilidade).
 * Só devolve dados do usuário autenticado. Nunca inclui hash de senha, tokens ou sessões.
 */
export async function GET(request: Request) {
  const session = await getServerAuthSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit({
    scope: 'me:export',
    key: getRateLimitKey(request, userId),
    max: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Voce ja exportou seus dados recentemente. Tente novamente mais tarde.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const take = MAX_ROWS;
  const [
    profile,
    posts,
    comments,
    businesses,
    events,
    jobs,
    housing,
    marketplaceItems,
    messages,
    businessFavorites,
    eventFavorites,
    businessRatings,
    eventRatings,
    groupMemberships,
    sentFriendRequests,
    receivedFriendRequests,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, omit: { passwordHash: true } }),
    prisma.communityPost.findMany({ where: { authorId: userId }, take }),
    prisma.postComment.findMany({ where: { authorId: userId }, take }),
    prisma.business.findMany({ where: { createdById: userId }, take }),
    prisma.event.findMany({ where: { createdById: userId }, take }),
    prisma.job.findMany({ where: { createdById: userId }, take }),
    prisma.housing.findMany({ where: { createdById: userId }, take }),
    prisma.marketplaceItem.findMany({ where: { createdById: userId }, take }),
    prisma.marketplaceMessage.findMany({
      where: { senderId: userId, deletedAt: null },
      select: { id: true, conversationId: true, content: true, createdAt: true },
      take,
    }),
    prisma.businessFavorite.findMany({ where: { userId }, take }),
    prisma.eventFavorite.findMany({ where: { userId }, take }),
    prisma.businessRating.findMany({ where: { userId }, take }),
    prisma.eventRating.findMany({ where: { userId }, take }),
    prisma.communityGroupMember.findMany({ where: { userId }, take }),
    prisma.friendRequest.findMany({ where: { requesterId: userId }, take }),
    prisma.friendRequest.findMany({ where: { recipientId: userId }, take }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    notice: 'Dados pessoais associados a sua conta. Mensagens recebidas de terceiros nao estao incluidas.',
    profile,
    content: { posts, comments, businesses, events, jobs, housing, marketplaceItems },
    messagesSent: messages,
    interactions: { businessFavorites, eventFavorites, businessRatings, eventRatings, groupMemberships },
    friendRequests: { sent: sentFriendRequests, received: receivedFriendRequests },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="gringoou-meus-dados.json"',
      'Cache-Control': 'no-store',
    },
  });
}
