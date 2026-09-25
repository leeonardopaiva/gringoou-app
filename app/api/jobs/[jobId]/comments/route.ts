import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { commentSchema } from '@/lib/validators';

type Context = { params: Promise<{ jobId: string }> };

const authorSelect = { id: true, name: true, username: true, image: true } as const;

const canManageListing = (
  session: Awaited<ReturnType<typeof getServerAuthSession>>,
  ownerId?: string | null,
) => Boolean(session?.user?.id) && (session?.user?.role === 'ADMIN' || session?.user?.id === ownerId);

const decorateComment = <
  T extends {
    authorId: string;
    content: string;
    isHidden: boolean;
    replies?: Array<{ authorId: string; content: string; isHidden: boolean }>;
  },
>(
  comment: T,
  session: Awaited<ReturnType<typeof getServerAuthSession>>,
  listingOwnerId: string,
) => {
  const manageListing = canManageListing(session, listingOwnerId);
  const decorate = <Item extends { authorId: string; content: string; isHidden: boolean }>(item: Item) => {
    const canManage = Boolean(session?.user?.id === item.authorId || manageListing);
    return {
      ...item,
      content: item.isHidden && !canManage ? 'Comentario ocultado pela moderacao.' : item.content,
      canEdit: canManage,
      canDelete: canManage,
      canHide: manageListing,
    };
  };

  return {
    ...decorate(comment),
    replies: comment.replies?.map((reply) => decorate(reply)) || [],
  };
};

export async function GET(_request: Request, context: Context) {
  const session = await getServerAuthSession();
  const { jobId } = await context.params;
  const job = await prisma.job.findFirst({
    where: { id: jobId, isActive: true },
    select: { id: true, createdById: true },
  });

  if (!job) return NextResponse.json({ error: 'Vaga nao encontrada.' }, { status: 404 });

  const comments = await prisma.jobComment.findMany({
    where: { jobId, parentId: null },
    orderBy: { createdAt: 'asc' },
    take: 50,
    include: {
      author: { select: authorSelect },
      replies: {
        orderBy: { createdAt: 'asc' },
        take: 20,
        include: { author: { select: authorSelect } },
      },
    },
  });

  return NextResponse.json({
    comments: comments.map((comment) => decorateComment(comment, session, job.createdById)),
  });
}

export async function POST(request: Request, context: Context) {
  const session = await getServerAuthSession();
  if (!session?.user?.id || !session.user.onboardingCompleted) {
    return NextResponse.json({ error: 'Entre na sua conta para comentar.' }, { status: 401 });
  }

  const { jobId } = await context.params;
  const body = await request.json();
  const parsed = commentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Comentario invalido.' }, { status: 400 });
  }

  const job = await prisma.job.findFirst({
    where: { id: jobId, isActive: true },
    select: { id: true, createdById: true },
  });

  if (!job) return NextResponse.json({ error: 'Vaga nao encontrada.' }, { status: 404 });

  const parentId = typeof body.parentId === 'string' ? body.parentId : null;
  if (parentId) {
    const parent = await prisma.jobComment.findFirst({
      where: { id: parentId, jobId, parentId: null },
      select: { id: true },
    });
    if (!parent) return NextResponse.json({ error: 'Comentario pai invalido.' }, { status: 400 });
  }

  const comment = await prisma.jobComment.create({
    data: { jobId, authorId: session.user.id, content: parsed.data.content, parentId },
    include: { author: { select: authorSelect } },
  });

  return NextResponse.json({
    comment: {
      ...comment,
      replies: [],
      canEdit: true,
      canDelete: true,
      canHide: canManageListing(session, job.createdById),
    },
  }, { status: 201 });
}
