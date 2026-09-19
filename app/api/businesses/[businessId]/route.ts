import { BusinessStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isVisibleForRegion } from '@/lib/visibility';

type RouteContext = {
  params: Promise<{
    businessId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerAuthSession();
  const { businessId } = await context.params;

  const business = await prisma.business.findFirst({
    where: {
      OR: [{ id: businessId }, { slug: businessId }],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      description: true,
      address: true,
      imageUrl: true,
      galleryUrls: true,
      locationLabel: true,
      regionKey: true,
      phone: true,
      whatsapp: true,
      website: true,
      instagram: true,
      ratingAverage: true,
      ratingCount: true,
      visibilityScope: true,
      visibilityRegionKey: true,
      status: true,
      createdById: true,
      createdAt: true,
      createdBy: {
        select: {
          name: true,
        },
      },
      favorites: {
        where: { userId: session?.user?.id || '__no-user__' },
        select: { id: true },
        take: 1,
      },
      ratings: {
        where: { userId: session?.user?.id || '__no-user__' },
        select: { stars: true },
        take: 1,
      },
      members: {
        where: { userId: session?.user?.id || '__no-user__' },
        select: {
          role: true,
        },
      },
    },
  });

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const canView =
    (business.status === BusinessStatus.PUBLISHED &&
      isVisibleForRegion(
        {
          regionKey: business.regionKey,
          visibilityScope: business.visibilityScope,
          visibilityRegionKey: business.visibilityRegionKey,
        },
        session?.user?.regionKey,
      )) ||
    session?.user?.role === 'ADMIN' ||
    session?.user?.id === business.createdById;

  const canEdit =
    session?.user?.role === 'ADMIN' ||
    session?.user?.id === business.createdById ||
    business.members.length > 0;

  const canRate =
    Boolean(session?.user?.id) && session?.user?.role !== 'ADMIN' && business.members.length === 0;

  if (!canView) {
    return NextResponse.json({ error: 'Business not available' }, { status: 404 });
  }

  return NextResponse.json({
    business: {
      ...business,
      members: undefined,
      favorites: undefined,
      ratings: undefined,
      canEdit,
      canRate,
      isFavorite: business.favorites.length > 0,
      viewerRating: business.ratings[0]?.stars ?? null,
      publicPath: `/negocios/${business.slug}`,
    },
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { businessId } = await context.params;

  const existingBusiness = await prisma.business.findFirst({
    where: {
      OR: [{ id: businessId }, { slug: businessId }],
    },
    select: {
      id: true,
      slug: true,
      createdById: true,
      members: {
        where: { userId: session.user.id },
        select: {
          role: true,
        },
      },
    },
  });

  if (!existingBusiness) {
    return NextResponse.json({ error: 'Negocio nao encontrado.' }, { status: 404 });
  }

  const canEdit =
    session.user.role === 'ADMIN' ||
    session.user.id === existingBusiness.createdById ||
    existingBusiness.members.length > 0;

  if (!canEdit) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const normalizedImageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() || null : undefined;
  const business = await prisma.$transaction(async (tx) => {
    const updatedBusiness = await tx.business.update({
      where: { id: existingBusiness.id },
      data: {
        name: typeof body.name === 'string' ? body.name.trim() : undefined,
        category: typeof body.category === 'string' ? body.category.trim() : undefined,
        description:
          typeof body.description === 'string' ? body.description.trim() || null : undefined,
        address: typeof body.address === 'string' ? body.address.trim() : undefined,
        phone: typeof body.phone === 'string' ? body.phone.trim() || null : undefined,
        whatsapp: typeof body.whatsapp === 'string' ? body.whatsapp.trim() || null : undefined,
        website: typeof body.website === 'string' ? body.website.trim() || null : undefined,
        instagram: typeof body.instagram === 'string' ? body.instagram.trim() || null : undefined,
        imageUrl: normalizedImageUrl,
        galleryUrls: Array.isArray(body.galleryUrls) ? body.galleryUrls : undefined,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        description: true,
        address: true,
        phone: true,
        whatsapp: true,
        website: true,
        instagram: true,
        imageUrl: true,
        galleryUrls: true,
        updatedAt: true,
      },
    });

    if (normalizedImageUrl !== undefined) {
      await tx.adAccount.updateMany({
        where: { businessId: existingBusiness.id },
        data: { logoUrl: normalizedImageUrl },
      });
    }

    return updatedBusiness;
  });

  return NextResponse.json({ business });
}
