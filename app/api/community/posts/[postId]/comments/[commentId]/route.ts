import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { commentSchema } from '@/lib/validators';
import { getGroupPostPermissions } from '@/lib/server/group-permissions';

type RouteContext = {
  params: Promise<{
    postId: string;
    commentId: string;
  }>;
};

const canManageComment = (
  session: Awaited<ReturnType<typeof getServerAuthSession>>,
  authorId: string,
) =>
  Boolean(session?.user?.id) &&
  (session?.user?.role === 'ADMIN' || session?.user?.id === authorId);

export async function PUT(request: Request, context: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { postId, commentId } = await context.params;
  const permissions = await getGroupPostPermissions(postId, session.user.id, session.user.role === 'ADMIN');
  if (!permissions?.canView) return NextResponse.json({ error: 'Publicação não encontrada.' }, { status: 404 });
  const existingComment = await prisma.postComment.findFirst({
    where: {
      id: commentId,
      postId,
    },
    select: {
      id: true,
      authorId: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
        },
      },
    },
  });

  if (!existingComment) {
    return NextResponse.json({ error: 'Comentario nao encontrado.' }, { status: 404 });
  }

  if (!canManageComment(session, existingComment.authorId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = commentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados invalidos do comentario.' },
      { status: 400 },
    );
  }

  const comment = await prisma.postComment.update({
    where: { id: existingComment.id },
    data: {
      content: parsed.data.content,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
        },
      },
    },
  });

  return NextResponse.json({
    comment: {
      ...comment,
      canEdit: true,
      canDelete: true,
    },
    message: 'Comentario atualizado.',
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { postId, commentId } = await context.params;
  const permissions = await getGroupPostPermissions(postId, session.user.id, session.user.role === 'ADMIN');
  if (!permissions?.canView) return NextResponse.json({ error: 'Publicação não encontrada.' }, { status: 404 });
  const existingComment = await prisma.postComment.findFirst({
    where: {
      id: commentId,
      postId,
    },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (!existingComment) {
    return NextResponse.json({ error: 'Comentario nao encontrado.' }, { status: 404 });
  }

  if (!canManageComment(session, existingComment.authorId) && !permissions.canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.postComment.delete({
    where: { id: existingComment.id },
  });

  return NextResponse.json({ message: 'Comentario removido.' });
}
