import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { marketplaceUseCases } from '@/lib/server/marketplace-usecases';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await marketplaceUseCases.toggleFavorite({ id, viewerId: session.user.id });

  return NextResponse.json(result);
}