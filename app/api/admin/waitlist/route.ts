import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import { listWaitlistEntries } from '@/lib/invites';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('q') || undefined;
  const page = Number(searchParams.get('page') ?? '1');

  const result = await listWaitlistEntries({
    search,
    status: (status as 'PENDING' | 'INVITED' | 'ACTIVE') || undefined,
    page: Number.isFinite(page) ? page : 1,
  });

  return NextResponse.json(result);
}