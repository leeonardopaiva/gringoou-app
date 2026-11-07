import { NextResponse } from 'next/server';
import { requireModerationSession } from '@/lib/require-moderation';
import { prisma } from '@/lib/prisma';

/** Fila de denúncias de mensagens para a moderação, com as últimas mensagens da conversa. */
export async function GET() {
  const { response } = await requireModerationSession();
  if (response) return response;

  const reports = await prisma.messageReport.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    include: {
      reporter: { select: { id: true, name: true, username: true, image: true } },
      reportedUser: { select: { id: true, name: true, username: true, image: true } },
      reviewedBy: { select: { id: true, name: true } },
      conversation: {
        select: {
          item: { select: { title: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, senderId: true, content: true, createdAt: true } },
        },
      },
    },
  });
  return NextResponse.json({ reports });
}
