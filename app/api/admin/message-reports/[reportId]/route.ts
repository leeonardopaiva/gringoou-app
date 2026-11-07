import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireModerationSession } from '@/lib/require-moderation';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ reportId: string }> };
const bodySchema = z.object({ status: z.enum(['RESOLVED', 'DISMISSED']) });

export async function PATCH(request: Request, context: RouteContext) {
  const { session, response } = await requireModerationSession();
  if (response) return response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });

  const { reportId } = await context.params;
  const result = await prisma.messageReport.updateMany({
    where: { id: reportId },
    data: { status: parsed.data.status, reviewedById: session.user.id, reviewedAt: new Date() },
  });
  if (result.count === 0) return NextResponse.json({ error: 'Denúncia não encontrada.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
