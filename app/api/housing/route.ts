import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { housingSchema } from '@/lib/validators';
import { getMockHousingResponse, USE_MOCKS } from '@/lib/server/mocks';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const propertyType = searchParams.get('propertyType')?.trim();
  const location = searchParams.get('location')?.trim();
  const price = searchParams.get('price')?.trim();
  const region = searchParams.get('region')?.trim();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.min(24, Math.max(1, Number(searchParams.get('pageSize')) || 8));
  if (USE_MOCKS) {
    return NextResponse.json(getMockHousingResponse(page, pageSize, region));
  }
  const where = {
    isActive: true,
    ...(region ? { regionKey: region } : {}),
    ...(propertyType ? { propertyType: { equals: propertyType, mode: 'insensitive' as const } } : {}),
    ...(location ? { locationLabel: { contains: location, mode: 'insensitive' as const } } : {}),
    ...(price ? { price: { contains: price, mode: 'insensitive' as const } } : {}),
    ...(query ? { OR: [
      { title: { contains: query, mode: 'insensitive' as const } },
      { description: { contains: query, mode: 'insensitive' as const } },
    ] } : {}),
  };
  const [housing, total] = await Promise.all([
    prisma.housing.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, include: { createdBy: { select: { id: true, name: true, username: true } } } }),
    prisma.housing.count({ where }),
  ]);
  return NextResponse.json({ housing, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.user.onboardingCompleted) return NextResponse.json({ error: 'Complete seu perfil antes de publicar.' }, { status: 403 });
  const parsed = housingSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' }, { status: 400 });
  const regionKey = parsed.data.regionKey ?? session.user.regionKey ?? null;
  const housing = await prisma.housing.create({ data: { ...parsed.data, regionKey, createdById: session.user.id } });
  return NextResponse.json({ housing }, { status: 201 });
}
