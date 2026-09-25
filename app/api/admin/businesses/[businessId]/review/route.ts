import { BusinessStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import { prisma } from '@/lib/prisma';
import { businessReviewSchema } from '@/lib/validators';

type RouteContext = {
  params: Promise<{
    businessId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { response } = await requireAdminSession();

  if (response) {
    return response;
  }

  const body = await request.json();
  const parsed = businessReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid review action' },
      { status: 400 },
    );
  }

  const { businessId } = await context.params;
  const nextStatus =
    parsed.data.action === 'approve'
      ? BusinessStatus.PUBLISHED
      : parsed.data.action === 'reject'
        ? BusinessStatus.REJECTED
        : BusinessStatus.SUSPENDED;

  const business = await prisma.business.update({
    where: { id: businessId },
    data: { status: nextStatus, ownershipVerifiedAt: parsed.data.action === 'approve' ? new Date() : null },
    select: {
      id: true,
      name: true,
      status: true,
      ownershipVerifiedAt: true,
    },
  });

  return NextResponse.json({ business });
}
