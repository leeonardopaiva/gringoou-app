import { NextResponse } from 'next/server';
import { resolveRegionScope, regionWhereFor } from '@/lib/region-scope';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { findRegionByKey } from '@/lib/region-store';
import { marketplaceCreateSchema } from '@/lib/validators';
import { marketplaceUseCases } from '@/lib/server/marketplace-usecases';

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  const viewerId = session?.user?.id ?? '';
  const isAdmin = session?.user?.role === 'ADMIN';
  const { searchParams } = new URL(request.url);

  const regionKey = resolveRegionScope(session, searchParams.get('region')).regionKey;
  const category = searchParams.get('category') || undefined;
  const query = searchParams.get('q') || undefined;
  const sort = searchParams.get('sort') as 'recent' | 'price_asc' | 'price_desc' | null;
  const scope = searchParams.get('scope') as 'all' | 'mine' | 'favorites' | null;
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const page = Number(searchParams.get('page') ?? '1');

  const result = await marketplaceUseCases.listMarketplace({
    viewerId,
    isAdmin,
    regionKey,
    category,
    query,
    sort,
    scope,
    minPriceCents: minPrice ? Number(minPrice) : null,
    maxPriceCents: maxPrice ? Number(maxPrice) : null,
    page: Number.isFinite(page) ? page : 1,
  });

  return NextResponse.json({
    items: result.items,
    scope: result.scope,
    total: result.total,
  });
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    scope: 'marketplace:create',
    key: getRateLimitKey(request, session.user.id),
    max: 10,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Cadastros demais em pouco tempo. Aguarde antes de publicar outro anuncio.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  if (!session.user.onboardingCompleted) {
    return NextResponse.json(
      { error: 'Complete your profile before creating a listing' },
      { status: 400 },
    );
  }

  const body = await request.json();
  const parsed = marketplaceCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid listing data' },
      { status: 400 },
    );
  }

  const region = await findRegionByKey(parsed.data.regionKey, { activeOnly: true });
  if (!region) {
    return NextResponse.json({ error: 'Selecione uma regiao valida.' }, { status: 400 });
  }

  const item = await marketplaceUseCases.createMarketplace({
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category,
    priceCents: parsed.data.isFree ? null : parsed.data.priceCents ?? null,
    isFree: parsed.data.isFree,
    condition: parsed.data.condition,
    locationLabel: parsed.data.locationLabel?.trim() || region.label,
    regionKey: region.key,
    imageUrl: parsed.data.imageUrl ?? null,
    galleryUrls: parsed.data.galleryUrls,
    createdById: session.user.id,
    latitude: parsed.data.latitude ?? null,
    longitude: parsed.data.longitude ?? null,
  });

  return NextResponse.json({
    item,
    message: 'Anuncio enviado para aprovacao.',
  });
}