import { NextResponse } from 'next/server';
import { requireModerationSession } from '@/lib/require-moderation';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const { response } = await requireModerationSession();
  if (response) return response;
  const reports = await prisma.communityGroupReport.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    include: {
      group: { select: { id: true, name: true, slug: true, imageUrl: true } },
      reporter: { select: { id: true, name: true, username: true, email: true, image: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
  });
  return NextResponse.json({ reports });
}
