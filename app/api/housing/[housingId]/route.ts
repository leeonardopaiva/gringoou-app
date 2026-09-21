import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { housingSchema } from '@/lib/validators';

type RouteContext = { params: Promise<{ housingId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  const { housingId } = await context.params;
  const housing = await prisma.housing.findUnique({
    where: { id: housingId },
    include: { createdBy: { select: { id: true, name: true, username: true } } },
  });
  return housing ? NextResponse.json({ housing: { ...housing, canEdit: session?.user?.id === housing.createdById || session?.user?.role === 'ADMIN' } }) : NextResponse.json({ error: 'Moradia nao encontrada.' }, { status: 404 });
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { housingId } = await context.params;
  const current = await prisma.housing.findUnique({ where: { id: housingId }, select: { createdById: true } });
  if (!current) return NextResponse.json({ error: 'Moradia nao encontrada.' }, { status: 404 });
  if (current.createdById !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const parsed = housingSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' }, { status: 400 });
  return NextResponse.json({ housing: await prisma.housing.update({ where: { id: housingId }, data: parsed.data }) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { housingId } = await context.params;
  const current = await prisma.housing.findUnique({ where: { id: housingId }, select: { createdById: true } });
  if (!current) return NextResponse.json({ error: 'Moradia nao encontrada.' }, { status: 404 });
  if (current.createdById !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await prisma.housing.delete({ where: { id: housingId } });
  return NextResponse.json({ success: true });
}
