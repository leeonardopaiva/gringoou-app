import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ postId: string }> };
type PreferenceAction = 'save' | 'interest' | 'hide' | 'report' | 'mute';

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { postId } = await context.params;
  const body = await request.json().catch(() => null);
  const action = body?.action as PreferenceAction | undefined;
  if (!action || !['save', 'interest', 'hide', 'report', 'mute'].includes(action)) {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  }

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });
  if (!post) return NextResponse.json({ error: 'Publicação não encontrada.' }, { status: 404 });

  if (action === 'report') {
    await prisma.postReport.upsert({
      where: { postId_authorId: { postId, authorId: session.user.id } },
      create: { postId, authorId: session.user.id, reason: typeof body?.reason === 'string' ? body.reason.slice(0, 500) : 'Denúncia da comunidade' },
      update: { reason: typeof body?.reason === 'string' ? body.reason.slice(0, 500) : 'Denúncia da comunidade' },
    });
    return NextResponse.json({ reported: true, message: 'Publicação reportada para moderação.' });
  }

  if (action === 'mute') {
    if (post.authorId === session.user.id) return NextResponse.json({ error: 'Você não pode mutar a própria conta.' }, { status: 400 });
    await prisma.userMute.upsert({
      where: { userId_mutedUserId: { userId: session.user.id, mutedUserId: post.authorId } },
      create: { userId: session.user.id, mutedUserId: post.authorId },
      update: {},
    });
    return NextResponse.json({ muted: true, message: 'Usuário mutado. As novas publicações dele não aparecerão no seu feed.' });
  }

  const field = action === 'save' ? 'isSaved' : action === 'interest' ? 'isInterested' : 'isHidden';
  const previous = await prisma.communityPostPreference.findUnique({ where: { postId_userId: { postId, userId: session.user.id } } });
  const enabled = !Boolean(previous?.[field]);
  const preference = await prisma.communityPostPreference.upsert({
    where: { postId_userId: { postId, userId: session.user.id } },
    create: { postId, userId: session.user.id, [field]: enabled },
    update: { [field]: enabled },
  });
  return NextResponse.json({ preference });
}
