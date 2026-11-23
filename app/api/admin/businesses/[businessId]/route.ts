import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findRegionByKey } from '@/lib/region-store';
import { requireAdminSession } from '@/lib/require-admin';
import { adminBusinessSchema } from '@/lib/validators';

type RouteContext = {
  params: Promise<{
    businessId: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { response } = await requireAdminSession();

  if (response) {
    return response;
  }

  const body = await request.json();
  const parsed = adminBusinessSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos do negócio.' },
      { status: 400 },
    );
  }

  const region = await findRegionByKey(parsed.data.regionKey);
  const visibilityRegion =
    parsed.data.visibilityScope === 'SPECIFIC_REGION' && parsed.data.visibilityRegionKey
      ? await findRegionByKey(parsed.data.visibilityRegionKey)
      : null;

  if (!region) {
    return NextResponse.json({ error: 'Região inválida.' }, { status: 400 });
  }

  if (parsed.data.visibilityScope === 'SPECIFIC_REGION' && !visibilityRegion) {
    return NextResponse.json({ error: 'Região de visibilidade inválida.' }, { status: 400 });
  }

  const { businessId } = await context.params;

  try {
    const business = await prisma.business.update({
      where: { id: businessId },
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        description: parsed.data.description,
        address: parsed.data.address,
        phone: parsed.data.phone,
        whatsapp: parsed.data.whatsapp,
        website: parsed.data.website,
        instagram: parsed.data.instagram,
        visibilityScope: parsed.data.visibilityScope,
        visibilityRegionKey:
          parsed.data.visibilityScope === 'SPECIFIC_REGION'
            ? parsed.data.visibilityRegionKey || null
            : null,
        imageUrl: parsed.data.imageUrl,
        galleryUrls: parsed.data.galleryUrls,
        locationLabel: region.label,
        regionKey: region.key,
        status: parsed.data.status,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        description: true,
        phone: true,
        whatsapp: true,
        website: true,
        instagram: true,
        address: true,
        locationLabel: true,
        regionKey: true,
        visibilityScope: true,
        visibilityRegionKey: true,
        imageUrl: true,
        galleryUrls: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        visibilityRegion: {
          select: {
            key: true,
            label: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ business });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Negócio não encontrado.' }, { status: 404 });
    }

    throw error;
  }
}
