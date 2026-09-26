import { FriendRequestStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { friendRequestDecisionSchema } from '@/lib/validators';
import { decideMockFriendRequest, USE_MOCKS } from '@/lib/server/mocks';

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = friendRequestDecisionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Acao invalida.' },
      { status: 400 },
    );
  }

  const { requestId } = await context.params;

  if (USE_MOCKS) {
    return NextResponse.json(decideMockFriendRequest(requestId, parsed.data.action));
  }

  const friendRequest = await prisma.friendRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      recipientId: true,
      status: true,
    },
  });

  if (!friendRequest || friendRequest.recipientId !== session.user.id) {
    return NextResponse.json({ error: 'Solicitacao nao encontrada.' }, { status: 404 });
  }

  if (friendRequest.status !== FriendRequestStatus.PENDING) {
    return NextResponse.json({ error: 'Essa solicitacao ja foi respondida.' }, { status: 400 });
  }

  const nextStatus =
    parsed.data.action === 'accept'
      ? FriendRequestStatus.ACCEPTED
      : FriendRequestStatus.DECLINED;

  const updated = await prisma.friendRequest.update({
    where: { id: friendRequest.id },
    data: { status: nextStatus },
    select: {
      id: true,
      status: true,
    },
  });

  return NextResponse.json({
    request: updated,
    message: nextStatus === FriendRequestStatus.ACCEPTED ? 'Conexao aceita.' : 'Solicitacao recusada.',
  });
}
