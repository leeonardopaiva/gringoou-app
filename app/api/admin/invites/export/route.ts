import { NextResponse } from 'next/server';
import { exportInvitesCsv } from '@/lib/invites';
import { requireAdminSession } from '@/lib/require-admin';

export const runtime = 'nodejs';

const STATUSES = ['ACTIVE', 'USED', 'EXPIRED', 'REVOKED'] as const;

/** CSV dos convites (somente administradores), respeitando o filtro de status e a busca. */
export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('q') || undefined;

  const { csv } = await exportInvitesCsv({
    search,
    status: STATUSES.find((item) => item === status) ?? undefined,
  });

  const day = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="convites-${day}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
