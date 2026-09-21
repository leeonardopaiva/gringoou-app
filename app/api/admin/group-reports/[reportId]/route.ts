import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireModerationSession } from '@/lib/require-moderation';
import { prisma } from '@/lib/prisma';

const schema = z.object({ status: z.enum(['RESOLVED', 'DISMISSED']) });
type Context = { params: Promise<{ reportId: string }> };

export async function PATCH(request: Request, context: Context) {
  const { session, response } = await requireModerationSession();
  if (response || !session) return response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
  const { reportId } = await context.params;
  const report = await prisma.communityGroupReport.update({ where: { id: reportId }, data: { status: parsed.data.status, reviewedAt: new Date(), reviewedById: session.user.id } }).catch(() => null);
  return report ? NextResponse.json({ report }) : NextResponse.json({ error: 'Denúncia não encontrada.' }, { status: 404 });
}
