import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { findRegionByKey } from '@/lib/region-store';
import { marketplaceUpdateSchema } from '@/lib/validators';
import { marketplaceUseCases } from '@/lib/server/marketplace-usecases';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerAuthSession();
  const viewerId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === 'ADMIN';

  const item = await marketplaceUseCases.getMarketplace({ id, viewerId, isAdmin });

  if (!item) {
    return NextResponse.json({ error: 'Anuncio nao encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = session?.user?.role === 'ADMIN';
  const body = await request.json();
  const parsed = marketplaceUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid listing data' },
      { status: 400 },
    );
  }

  if (parsed.data.regionKey) {
    const region = await findRegionByKey(parsed.data.regionKey, { activeOnly: true });
    if (!region) {
      return NextResponse.json({ error: 'Selecione uma regiao valida.' }, { status: 400 });
    }
  }

  const item = await marketplaceUseCases.updateMarketplace({
    id,
    viewerId: session.user.id,
    isAdmin,
    data: {
      ...parsed.data,
      priceCents: parsed.data.isFree ? null : parsed.data.priceCents ?? undefined,
    },
  });

  if (!item) {
    return NextResponse.json(
      { error: 'Voce nao tem permissao para editar este anuncio.' },
      { status: 403 },
    );
  }

  return NextResponse.json({ item, message: 'Anuncio atualizado.' });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = session?.user?.role === 'ADMIN';
  const removed = await marketplaceUseCases.removeMarketplace({
    id,
    viewerId: session.user.id,
    isAdmin,
  });

  if (!removed) {
    return NextResponse.json(
      { error: 'Voce nao tem permissao para excluir este anuncio.' },
      { status: 403 },
    );
  }

  return NextResponse.json({ message: 'Anuncio removido.' });
}