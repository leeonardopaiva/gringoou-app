import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string; commentId: string }> };

/** Depois desta quantidade de pessoas diferentes denunciando, o comentário é ocultado até a moderação revisar. */
const AUTO_HIDE_THRESHOLD = 3;

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id, commentId } = await params;

  const comment = await prisma.newsComment.findFirst({
    where: { id: commentId, articleId: id },
    select: { id: true, authorId: true },
  });
  if (!comment) {
    return NextResponse.json({ error: 'Comentário não encontrado.' }, { status: 404 });
  }
  if (comment.authorId === session.user.id) {
    return NextResponse.json({ error: 'Você não pode denunciar o seu comentário.' }, { status: 400 });
  }

  await prisma.newsCommentReport.upsert({
    where: { commentId_reporterId: { commentId, reporterId: session.user.id } },
    create: { commentId, reporterId: session.user.id },
    update: {},
  });

  const reports = await prisma.newsCommentReport.count({ where: { commentId } });
  if (reports >= AUTO_HIDE_THRESHOLD) {
    await prisma.newsComment.update({ where: { id: commentId }, data: { isHidden: true } });
  }

  return NextResponse.json({ ok: true, message: 'Denúncia enviada. Obrigado por avisar.' });
}
