import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { commentSchema } from '@/lib/validators';

type Context = { params: Promise<{ housingId: string; commentId: string }> };
const authorSelect = { id: true, name: true, username: true, image: true } as const;
const canManage = (s: Awaited<ReturnType<typeof getServerAuthSession>>, ownerId?: string | null) => Boolean(s?.user?.id) && (s?.user?.role === 'ADMIN' || s?.user?.id === ownerId);

async function getAccess(housingId: string, commentId: string, session: Awaited<ReturnType<typeof getServerAuthSession>>) {
  const housing = await prisma.housing.findFirst({ where: { id: housingId, isActive: true }, select: { id: true, createdById: true } });
  if (!housing) return null;
  const comment = await prisma.housingComment.findFirst({ where: { id: commentId, housingId }, select: { id: true, authorId: true } });
  if (!comment) return null;
  const manage = canManage(session, housing.createdById);
  return { comment, manage, allowed: session?.user?.id === comment.authorId || manage };
}

export async function PUT(request: Request, context: Context) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { housingId, commentId } = await context.params;
  const access = await getAccess(housingId, commentId, session);
  if (!access) return NextResponse.json({ error: 'Comentario nao encontrado.' }, { status: 404 });
  if (!access.allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = commentSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Comentario invalido.' }, { status: 400 });
  const comment = await prisma.housingComment.update({ where: { id: commentId }, data: { content: parsed.data.content }, include: { author: { select: authorSelect } } });
  return NextResponse.json({ comment: { ...comment, canEdit: true, canDelete: true, canHide: access.manage } });
}

export async function PATCH(request: Request, context: Context) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { housingId, commentId } = await context.params;
  const access = await getAccess(housingId, commentId, session);
  if (!access) return NextResponse.json({ error: 'Comentario nao encontrado.' }, { status: 404 });
  if (!access.manage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const hide = body.action !== 'unhide';
  const comment = await prisma.housingComment.update({ where: { id: commentId }, data: { isHidden: hide, hiddenAt: hide ? new Date() : null }, include: { author: { select: authorSelect } } });
  return NextResponse.json({ comment: { ...comment, canEdit: true, canDelete: true, canHide: true } });
}

export async function DELETE(_request: Request, context: Context) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { housingId, commentId } = await context.params;
  const access = await getAccess(housingId, commentId, session);
  if (!access) return NextResponse.json({ error: 'Comentario nao encontrado.' }, { status: 404 });
  if (!access.allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.housingComment.delete({ where: { id: commentId } });
  return NextResponse.json({ message: 'Comentario removido.' });
}
