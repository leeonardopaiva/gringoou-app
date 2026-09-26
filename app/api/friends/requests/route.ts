import { FriendRequestStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { friendRequestCreateSchema } from '@/lib/validators';
import { sendMockFriendRequest, USE_MOCKS } from '@/lib/server/mocks';

const userSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
  locationLabel: true,
};

export async function GET() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (USE_MOCKS) {
    return NextResponse.json({ requests: [] });
  }

  const requests = await prisma.friendRequest.findMany({
    where: {
      recipientId: session.user.id,
      status: FriendRequestStatus.PENDING,
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 20,
    select: {
      id: true,
      createdAt: true,
      requester: {
        select: userSelect,
      },
    },
  });

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = friendRequestCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' },
      { status: 400 },
    );
  }

  if (USE_MOCKS) {
    const recipientRef = parsed.data.recipientId || parsed.data.username || '';
    return NextResponse.json(sendMockFriendRequest(recipientRef));
  }

  const recipient = await prisma.user.findFirst({
    where: parsed.data.recipientId
      ? { id: parsed.data.recipientId }
      : { username: parsed.data.username?.trim().toLowerCase() },
    select: {
      id: true,
    },
  });

  if (!recipient) {
    return NextResponse.json({ error: 'Perfil nao encontrado.' }, { status: 404 });
  }

  if (recipient.id === session.user.id) {
    return NextResponse.json({ error: 'Voce nao pode adicionar seu proprio perfil.' }, { status: 400 });
  }

  const existingAccepted = await prisma.friendRequest.findFirst({
    where: {
      status: FriendRequestStatus.ACCEPTED,
      OR: [
        { requesterId: session.user.id, recipientId: recipient.id },
        { requesterId: recipient.id, recipientId: session.user.id },
      ],
    },
    select: { id: true },
  });

  if (existingAccepted) {
    return NextResponse.json({
      status: 'accepted',
      requestId: existingAccepted.id,
      message: 'Voces ja estao conectados.',
    });
  }

  const incomingPending = await prisma.friendRequest.findUnique({
    where: {
      requesterId_recipientId: {
        requesterId: recipient.id,
        recipientId: session.user.id,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (incomingPending?.status === FriendRequestStatus.PENDING) {
    const accepted = await prisma.friendRequest.update({
      where: { id: incomingPending.id },
      data: { status: FriendRequestStatus.ACCEPTED },
      select: { id: true },
    });

    return NextResponse.json({
      status: 'accepted',
      requestId: accepted.id,
      message: 'Conexao aceita.',
    });
  }

  const outgoing = await prisma.friendRequest.upsert({
    where: {
      requesterId_recipientId: {
        requesterId: session.user.id,
        recipientId: recipient.id,
      },
    },
    update: {
      status: FriendRequestStatus.PENDING,
    },
    create: {
      requesterId: session.user.id,
      recipientId: recipient.id,
      status: FriendRequestStatus.PENDING,
    },
    select: {
      id: true,
      status: true,
    },
  });

  return NextResponse.json({
    status: outgoing.status.toLowerCase(),
    requestId: outgoing.id,
    message: 'Solicitacao enviada.',
  });
}
