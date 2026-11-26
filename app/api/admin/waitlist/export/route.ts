import { NextResponse } from 'next/server';
import { exportWaitlistCsv } from '@/lib/invites';
import { requireAdminSession } from '@/lib/require-admin';

export const runtime = 'nodejs';

const STATUSES = ['PENDING', 'INVITED', 'ACTIVE'] as const;

/**
 * CSV da lista de interesse (somente administradores). Sem filtros exporta a lista completa;
 * com `country` exporta só aquele país/região ("__none__" = quem não informou o país).
 */
export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const country = searchParams.get('country') || undefined;
  const search = searchParams.get('q') || undefined;

  const { csv } = await exportWaitlistCsv({
    search,
    country,
    status: STATUSES.find((item) => item === status) ?? undefined,
  });

  const scope = country ? (country === '__none__' ? 'sem-pais' : country.normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase()) : 'completa';
  const day = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="lista-de-interesse-${scope}-${day}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
