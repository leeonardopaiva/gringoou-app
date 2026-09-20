import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { communityPostSchema } from '@/lib/validators';
import { getGroupPostPermissions } from '@/lib/server/group-permissions';

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { postId } = await context.params;
  const permissions = await getGroupPostPermissions(postId, session.user.id, session.user.role === 'ADMIN');
  const existingPost = permissions?.post;

  if (!existingPost) {
    return NextResponse.json({ error: 'Publicacao nao encontrada.' }, { status: 404 });
  }

  if (!permissions.canView) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (session.user.role !== 'ADMIN' && existingPost.authorId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = communityPostSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados invalidos da publicacao.' },
      { status: 400 },
    );
  }

  const updatedPost = await prisma.communityPost.update({
    where: { id: existingPost.id },
    data: {
      content: parsed.data.content,
      imageUrl: parsed.data.imageUrl ?? null,
      externalUrl: parsed.data.externalUrl ?? null,
    },
    select: {
      id: true,
      content: true,
      imageUrl: true,
      externalUrl: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ post: updatedPost, message: 'Publicacao atualizada.' });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { postId } = await context.params;
  const permissions = await getGroupPostPermissions(postId, session.user.id, session.user.role === 'ADMIN');
  const existingPost = permissions?.post;

  if (!existingPost) {
    return NextResponse.json({ error: 'Publicacao nao encontrada.' }, { status: 404 });
  }

  if (!permissions?.canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.communityPost.delete({
    where: { id: existingPost.id },
  });

  return NextResponse.json({ message: 'Publicacao removida.' });
}
