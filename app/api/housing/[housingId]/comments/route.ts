import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { commentSchema } from '@/lib/validators';

type Context = { params: Promise<{ housingId: string }> };
const authorSelect = { id: true, name: true, username: true, image: true } as const;

const canManage = (session: Awaited<ReturnType<typeof getServerAuthSession>>, ownerId?: string | null) =>
  Boolean(session?.user?.id) && (session?.user?.role === 'ADMIN' || session?.user?.id === ownerId);

const decorateComment = <
  T extends { authorId: string; content: string; isHidden: boolean; replies?: Array<{ authorId: string; content: string; isHidden: boolean }> },
>(comment: T, session: Awaited<ReturnType<typeof getServerAuthSession>>, ownerId: string) => {
  const manageListing = canManage(session, ownerId);
  const decorate = <Item extends { authorId: string; content: string; isHidden: boolean }>(item: Item) => {
    const allowed = Boolean(session?.user?.id === item.authorId || manageListing);
    return {
      ...item,
      content: item.isHidden && !allowed ? 'Comentario ocultado pela moderacao.' : item.content,
      canEdit: allowed,
      canDelete: allowed,
      canHide: manageListing,
    };
  };
  return { ...decorate(comment), replies: comment.replies?.map((reply) => decorate(reply)) || [] };
};

export async function GET(_request: Request, context: Context) {
  const session = await getServerAuthSession();
  const { housingId } = await context.params;
  const housing = await prisma.housing.findFirst({ where: { id: housingId, isActive: true }, select: { id: true, createdById: true } });
  if (!housing) return NextResponse.json({ error: 'Moradia nao encontrada.' }, { status: 404 });

  const comments = await prisma.housingComment.findMany({
    where: { housingId, parentId: null },
    orderBy: { createdAt: 'asc' },
    take: 50,
    include: { author: { select: authorSelect }, replies: { orderBy: { createdAt: 'asc' }, take: 20, include: { author: { select: authorSelect } } } },
  });

  return NextResponse.json({ comments: comments.map((comment) => decorateComment(comment, session, housing.createdById)) });
}

export async function POST(request: Request, context: Context) {
  const session = await getServerAuthSession();
  if (!session?.user?.id || !session.user.onboardingCompleted) return NextResponse.json({ error: 'Entre na sua conta para comentar.' }, { status: 401 });

  const { housingId } = await context.params;
  const body = await request.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Comentario invalido.' }, { status: 400 });

  const housing = await prisma.housing.findFirst({ where: { id: housingId, isActive: true }, select: { id: true, createdById: true } });
  if (!housing) return NextResponse.json({ error: 'Moradia nao encontrada.' }, { status: 404 });

  const parentId = typeof body.parentId === 'string' ? body.parentId : null;
  if (parentId) {
    const parent = await prisma.housingComment.findFirst({ where: { id: parentId, housingId, parentId: null }, select: { id: true } });
    if (!parent) return NextResponse.json({ error: 'Comentario pai invalido.' }, { status: 400 });
  }

  const comment = await prisma.housingComment.create({
    data: { housingId, authorId: session.user.id, content: parsed.data.content, parentId },
    include: { author: { select: authorSelect } },
  });

  return NextResponse.json({ comment: { ...comment, replies: [], canEdit: true, canDelete: true, canHide: canManage(session, housing.createdById) } }, { status: 201 });
}
