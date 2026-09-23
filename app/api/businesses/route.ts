import { AdAccountRole, BusinessStatus, BusinessMemberRole, UserRole, VisibilityScope } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { findRegionByKey } from '@/lib/region-store';
import { slugify, uniqueSlug } from '@/lib/slug';
import { businessSchema } from '@/lib/validators';
import { getBusinessesPage } from '@/lib/server/businesses';

const createBusinessSchema = businessSchema.extend({
  adAccountId: z.string().cuid().optional(),
});

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  const { searchParams } = new URL(request.url);
  if (searchParams.get('mine') === '1') {
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const businesses = await prisma.business.findMany({
      where: { OR: [{ createdById: session.user.id }, { members: { some: { userId: session.user.id } } }] },
      select: { id: true, slug: true, name: true, imageUrl: true, status: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ businesses });
  }
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const viewerRegionKey = searchParams.get('region') ?? session?.user?.regionKey;
  return NextResponse.json(await getBusinessesPage({ session, regionKey: viewerRegionKey, category, search }));
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    scope: 'business:create',
    key: getRateLimitKey(request, session.user.id),
    max: 4,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Cadastros demais em pouco tempo. Aguarde antes de enviar outro negocio.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  if (!session.user.onboardingCompleted) {
    return NextResponse.json(
      { error: 'Complete your profile before creating a business' },
      { status: 400 },
    );
  }

  const body = await request.json();
  const parsed = createBusinessSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid business data' },
      { status: 400 },
    );
  }

  const region = await findRegionByKey(parsed.data.regionKey, { activeOnly: true });

  if (!region) {
    return NextResponse.json({ error: 'Selecione uma regiao valida.' }, { status: 400 });
  }

  if (parsed.data.adAccountId) {
    const legacyAccount = await prisma.adAccountUser.findUnique({
      where: {
        adAccountId_userId: {
          adAccountId: parsed.data.adAccountId,
          userId: session.user.id,
        },
      },
      select: {
        role: true,
        adAccount: { select: { businessId: true } },
      },
    });
    const canLinkAccount = legacyAccount && (
      legacyAccount.role === AdAccountRole.BUSINESS_ADMIN || legacyAccount.role === AdAccountRole.ADMIN
    );
    if (!canLinkAccount) {
      return NextResponse.json({ error: 'Você não pode vincular esta conta Ads.' }, { status: 403 });
    }
    if (legacyAccount.adAccount.businessId) {
      return NextResponse.json({ error: 'Esta conta Ads já possui uma página de negócio.' }, { status: 409 });
    }
  }

  const baseSlug = slugify(parsed.data.name);
  const slug =
    baseSlug &&
    !(await prisma.business.findUnique({
      where: { slug: baseSlug },
      select: { id: true },
    }))
      ? baseSlug
      : uniqueSlug(parsed.data.name);

  const business = await prisma.$transaction(async (tx) => {
    const created = await tx.business.create({
      data: {
        name: parsed.data.name,
        slug,
        category: parsed.data.category,
        description: parsed.data.description,
        address: parsed.data.address,
        phone: parsed.data.phone,
        whatsapp: parsed.data.whatsapp,
        website: parsed.data.website,
        instagram: parsed.data.instagram,
        imageUrl: parsed.data.imageUrl,
        galleryUrls: parsed.data.galleryUrls,
        locationLabel: region.label,
        regionKey: region.key,
        visibilityScope: VisibilityScope.USER_REGION,
        status: BusinessStatus.PENDING_REVIEW,
        createdById: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: BusinessMemberRole.OWNER,
          },
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
      },
    });

    if (parsed.data.adAccountId) {
      const linked = await tx.adAccount.updateMany({
        where: { id: parsed.data.adAccountId, businessId: null },
        data: { businessId: created.id },
      });
      if (linked.count !== 1) throw new Error('AD_ACCOUNT_ALREADY_LINKED');
    }

    await tx.user.update({
      where: { id: session.user.id },
      data: {
        role: session.user.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.BUSINESS_OWNER,
      },
    });

    return created;
  }).catch((error) => {
    if (error instanceof Error && error.message === 'AD_ACCOUNT_ALREADY_LINKED') return null;
    throw error;
  });

  if (!business) {
    return NextResponse.json({ error: 'A conta Ads foi vinculada por outra solicitação. Atualize a página.' }, { status: 409 });
  }

  return NextResponse.json({
    business,
    publicPath: `/negocios/${business.slug}`,
    linkedAdAccountId: parsed.data.adAccountId ?? null,
    message: 'Business submitted for review',
  });
}
