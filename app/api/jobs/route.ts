import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { jobSchema } from '@/lib/validators';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const employmentType = searchParams.get('employmentType')?.trim();
  const location = searchParams.get('location')?.trim();
  const salary = searchParams.get('salary')?.trim();
  const country = searchParams.get('country')?.trim().toUpperCase();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.min(24, Math.max(1, Number(searchParams.get('pageSize')) || 8));
  const where = {
    isActive: true,
    ...(employmentType ? { employmentType: { equals: employmentType, mode: 'insensitive' as const } } : {}),
    ...(location ? { locationLabel: { contains: location, mode: 'insensitive' as const } } : {}),
    ...(salary ? { salary: { contains: salary, mode: 'insensitive' as const } } : {}),
    ...(country ? { countryCode: country } : {}),
    ...(query ? { OR: [
      { title: { contains: query, mode: 'insensitive' as const } },
      { company: { contains: query, mode: 'insensitive' as const } },
      { description: { contains: query, mode: 'insensitive' as const } },
    ] } : {}),
  };
  const [jobs, total] = await Promise.all([
    prisma.job.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, include: { createdBy: { select: { id: true, name: true, username: true } } } }),
    prisma.job.count({ where }),
  ]);
  return NextResponse.json({ jobs, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.user.onboardingCompleted) return NextResponse.json({ error: 'Complete seu perfil antes de publicar.' }, { status: 403 });
  const parsed = jobSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' }, { status: 400 });
  }

  const business = parsed.data.businessId
    ? await prisma.business.findFirst({
        where: {
          id: parsed.data.businessId,
          OR: [{ createdById: session.user.id }, { members: { some: { userId: session.user.id } } }],
        },
        select: { id: true, name: true },
      })
    : null;
  if (parsed.data.businessId && !business) {
    return NextResponse.json({ error: 'Selecione um negócio que você administra.' }, { status: 403 });
  }
  const job = await prisma.job.create({
    data: {
      ...parsed.data,
      company: business?.name ?? parsed.data.company,
      businessId: business?.id,
      createdById: session.user.id,
    },
  });
  return NextResponse.json({ job }, { status: 201 });
}
