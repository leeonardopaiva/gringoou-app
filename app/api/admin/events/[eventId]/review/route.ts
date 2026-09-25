import { EventStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import { prisma } from '@/lib/prisma';
import { eventReviewSchema } from '@/lib/validators';

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { response } = await requireAdminSession();

  if (response) {
    return response;
  }

  const body = await request.json();
  const parsed = eventReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid review action' },
      { status: 400 },
    );
  }

  const { eventId } = await context.params;
  const nextStatus =
    parsed.data.action === 'approve'
      ? EventStatus.PUBLISHED
      : parsed.data.action === 'reject'
        ? EventStatus.REJECTED
        : EventStatus.CANCELED;

  const event = await prisma.event.update({
    where: { id: eventId },
    data: { status: nextStatus, ownershipVerifiedAt: parsed.data.action === 'approve' ? new Date() : null },
    select: {
      id: true,
      title: true,
      status: true,
      ownershipVerifiedAt: true,
    },
  });

  return NextResponse.json({ event });
}
