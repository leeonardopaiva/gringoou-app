import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireModerationSession } from '@/lib/require-moderation';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ commentId: string }> };
const bodySchema = z.object({ action: z.enum(['hide', 'dismiss', 'delete']) });

/**
 * Decisão da moderação sobre um comentário denunciado:
 * - hide: mantém oculto; - dismiss: denúncia improcedente (limpa as denúncias e reexibe); - delete: apaga o comentário.
 */
export async function POST(request: Request, context: RouteContext) {
  const { response } = await requireModerationSession();
  if (response) return response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });

  const { commentId } = await context.params;
  const exists = await prisma.newsComment.findUnique({ where: { id: commentId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: 'Comentário não encontrado.' }, { status: 404 });

  if (parsed.data.action === 'delete') {
    await prisma.newsComment.delete({ where: { id: commentId } });
  } else if (parsed.data.action === 'hide') {
    await prisma.newsComment.update({ where: { id: commentId }, data: { isHidden: true } });
  } else {
    await prisma.$transaction([
      prisma.newsCommentReport.deleteMany({ where: { commentId } }),
      prisma.newsComment.update({ where: { id: commentId }, data: { isHidden: false } }),
    ]);
  }
  return NextResponse.json({ ok: true });
}
