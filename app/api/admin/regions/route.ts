import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ensureRegionCatalog } from '@/lib/region-store';
import { requireAdminSession } from '@/lib/require-admin';
import { slugifyRegionKey } from '@/lib/regions';
import { prisma } from '@/lib/prisma';
import { adminRegionSchema } from '@/lib/validators';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { response } = await requireAdminSession();

  if (response) {
    return response;
  }

  await ensureRegionCatalog();

  const body = await request.json();
  const parsed = adminRegionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos da região' },
      { status: 400 },
    );
  }

  const regionKey =
    parsed.data.key || slugifyRegionKey(`${parsed.data.city}-${parsed.data.state}`);

  try {
    const region = await prisma.region.create({
      data: {
        key: regionKey,
        label: parsed.data.label,
        city: parsed.data.city,
        state: parsed.data.state,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        aliases: parsed.data.aliases,
        isActive: parsed.data.isActive,
      },
      select: {
        key: true,
        label: true,
        city: true,
        state: true,
        lat: true,
        lng: true,
        aliases: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ region }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Já existe uma região com essa chave ou nome.' },
        { status: 409 },
      );
    }

    throw error;
  }
}
