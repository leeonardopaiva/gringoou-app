import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { commentSchema } from '@/lib/validators';

type Context = { params: Promise<{ housingId: string }> };
const authorSelect = { id: true, name: true, username: true, image: true } as const;

export async function GET(_request: Request, context: Context) {
  const { housingId } = await context.params;
  const comments = await prisma.housingComment.findMany({
    where: { housingId, parentId: null }, orderBy: { createdAt: 'asc' }, take: 50,
    include: { author: { select: authorSelect }, replies: { orderBy: { createdAt: 'asc' }, take: 20, include: { author: { select: authorSelect } } } },
  });
  return NextResponse.json({ comments });
}

export async function POST(request: Request, context: Context) {
  const session = await getServerAuthSession();
  if (!session?.user?.id || !session.user.onboardingCompleted) return NextResponse.json({ error: 'Entre na sua conta para comentar.' }, { status: 401 });
  const { housingId } = await context.params;
  const body = await request.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Comentário inválido.' }, { status: 400 });
  const housing = await prisma.housing.findFirst({ where: { id: housingId, isActive: true }, select: { id: true } });
  if (!housing) return NextResponse.json({ error: 'Moradia não encontrada.' }, { status: 404 });
  const parentId = typeof body.parentId === 'string' ? body.parentId : null;
  if (parentId && !await prisma.housingComment.findFirst({ where: { id: parentId, housingId, parentId: null }, select: { id: true } })) return NextResponse.json({ error: 'Comentário pai inválido.' }, { status: 400 });
  const comment = await prisma.housingComment.create({ data: { housingId, authorId: session.user.id, content: parsed.data.content, parentId }, include: { author: { select: authorSelect } } });
  return NextResponse.json({ comment }, { status: 201 });
}
