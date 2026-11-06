import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { findRegionByKey } from '@/lib/region-store';
import { marketplaceUpdateSchema } from '@/lib/validators';
import { marketplaceUseCases } from '@/lib/server/marketplace-usecases';
import { marketplaceErrorResponse } from '@/lib/server/marketplace-errors';
import { getStoredUserRole } from '@/lib/admin';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerAuthSession();
  const viewerId = session?.user?.id ?? null;
  const role = viewerId ? await getStoredUserRole(viewerId) : null;
  const isAdmin = role === 'ADMIN';
  const canModerate = role === 'ADMIN' || role === 'MODERATOR';

  const item = await marketplaceUseCases.getMarketplace({ id, viewerId, isAdmin, canModerate });

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

  const isAdmin = (await getStoredUserRole(session.user.id)) === 'ADMIN';
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

  let item;
  try {
    item = await marketplaceUseCases.updateMarketplace({
      id,
      viewerId: session.user.id,
      isAdmin,
      data: {
        ...parsed.data,
        priceCents: parsed.data.isFree ? null : parsed.data.priceCents ?? undefined,
      },
    });
  } catch (error) {
    return marketplaceErrorResponse(error);
  }

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

  const isAdmin = (await getStoredUserRole(session.user.id)) === 'ADMIN';
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