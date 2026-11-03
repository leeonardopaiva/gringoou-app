import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import { createInvite, listInvites } from '@/lib/invites';
import { z } from 'zod';

export const runtime = 'nodejs';

const createInviteSchema = z.object({
  email: z.string().trim().email('Informe um email valido.').optional().or(z.literal('')),
  usageLimit: z.coerce.number().int().min(1).max(100).default(1),
  expiresAt: z.string().datetime().optional().nullable(),
  waitlistEntryId: z.string().trim().optional().nullable(),
});

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('q') || undefined;
  const page = Number(searchParams.get('page') ?? '1');

  const result = await listInvites({
    search,
    status: (status as 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED') || undefined,
    page: Number.isFinite(page) ? page : 1,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const body = await request.json().catch(() => null);
  const parsed = createInviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' },
      { status: 400 },
    );
  }

  const invite = await createInvite({
    email: parsed.data.email || null,
    usageLimit: parsed.data.usageLimit,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    waitlistEntryId: parsed.data.waitlistEntryId || null,
    createdById: session.user.id,
  });

  return NextResponse.json({ invite });
}