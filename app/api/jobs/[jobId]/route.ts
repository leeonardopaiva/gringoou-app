import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { jobSchema } from '@/lib/validators';

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  const { jobId } = await context.params;
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { createdBy: { select: { id: true, name: true, username: true } } },
  });
  return job
    ? NextResponse.json({ job: { ...job, canEdit: session?.user?.id === job.createdById || session?.user?.role === 'ADMIN' } })
    : NextResponse.json({ error: 'Vaga nao encontrada.' }, { status: 404 });
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { jobId } = await context.params;
  const current = await prisma.job.findUnique({ where: { id: jobId }, select: { createdById: true } });
  if (!current) return NextResponse.json({ error: 'Vaga nao encontrada.' }, { status: 404 });
  if (current.createdById !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const parsed = jobSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' }, { status: 400 });
  const business = parsed.data.businessId
    ? await prisma.business.findFirst({ where: { id: parsed.data.businessId, OR: [{ createdById: session.user.id }, { members: { some: { userId: session.user.id } } }] }, select: { id: true, name: true } })
    : null;
  if (parsed.data.businessId && !business) return NextResponse.json({ error: 'Selecione um negócio que você administra.' }, { status: 403 });
  return NextResponse.json({ job: await prisma.job.update({ where: { id: jobId }, data: { ...parsed.data, company: business?.name ?? parsed.data.company, businessId: business?.id } }) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { jobId } = await context.params;
  const current = await prisma.job.findUnique({ where: { id: jobId }, select: { createdById: true } });
  if (!current) return NextResponse.json({ error: 'Vaga nao encontrada.' }, { status: 404 });
  if (current.createdById !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await prisma.job.delete({ where: { id: jobId } });
  return NextResponse.json({ success: true });
}
