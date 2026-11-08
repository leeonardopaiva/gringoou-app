import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string; commentId: string }> };

const isModerator = (role?: string | null) => role === 'ADMIN' || role === 'MODERATOR';

/** Quem escreveu ou a moderação pode excluir o comentário. */
export async function DELETE(_request: Request, { params }: RouteContext) {
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
  if (comment.authorId !== session.user.id && !isModerator(session.user.role)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  await prisma.newsComment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}

/** Moderação oculta ou reexibe o comentário. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id || !isModerator(session.user.role)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }
  const { id, commentId } = await params;
  const body = await request.json().catch(() => null);
  if (body?.action !== 'hide' && body?.action !== 'unhide') {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  }

  const result = await prisma.newsComment.updateMany({
    where: { id: commentId, articleId: id },
    data: { isHidden: body.action === 'hide' },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: 'Comentário não encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
