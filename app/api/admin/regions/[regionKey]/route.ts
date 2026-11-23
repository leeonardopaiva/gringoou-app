import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireAdminSession } from '@/lib/require-admin';
import { prisma } from '@/lib/prisma';
import { adminRegionSchema } from '@/lib/validators';

type RouteContext = {
  params: Promise<{
    regionKey: string;
  }>;
};

export const runtime = 'nodejs';

export async function PUT(request: Request, context: RouteContext) {
  const { response } = await requireAdminSession();

  if (response) {
    return response;
  }

  const body = await request.json();
  const parsed = adminRegionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos da região' },
      { status: 400 },
    );
  }

  const { regionKey } = await context.params;
  const currentRegion = await prisma.region.findUnique({
    where: { key: regionKey },
    select: {
      key: true,
      label: true,
    },
  });

  if (!currentRegion) {
    return NextResponse.json({ error: 'Região não encontrada' }, { status: 404 });
  }

  try {
    const region = await prisma.$transaction(async (tx) => {
      const updatedRegion = await tx.region.update({
        where: { key: regionKey },
        data: {
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

      if (currentRegion.label !== updatedRegion.label) {
        await Promise.all([
          tx.user.updateMany({
            where: { regionKey },
            data: { locationLabel: updatedRegion.label },
          }),
          tx.business.updateMany({
            where: { regionKey },
            data: { locationLabel: updatedRegion.label },
          }),
          tx.event.updateMany({
            where: { regionKey },
            data: { locationLabel: updatedRegion.label },
          }),
          tx.communityPost.updateMany({
            where: { regionKey },
            data: { locationLabel: updatedRegion.label },
          }),
        ]);
      }

      return updatedRegion;
    });

    return NextResponse.json({ region });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json({ error: 'Já existe uma região com esse nome.' }, { status: 409 });
    }

    throw error;
  }
}
