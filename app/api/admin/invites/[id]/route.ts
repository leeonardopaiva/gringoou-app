import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import { getInvite, revokeInvite } from '@/lib/invites';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const invite = await getInvite(id);

  if (!invite) {
    return NextResponse.json({ error: 'Convite nao encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ invite });
}

export async function POST(_request: Request, { params }: RouteContext) {
  const { session, response } = await requireAdminSession();
  if (response || !session) return response;

  const { id } = await params;
  const revoked = await revokeInvite(id, session.user.id);

  if (!revoked) {
    return NextResponse.json(
      { error: 'Nao foi possivel revogar este convite (ja utilizado ou revogado).' },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, message: 'Convite revogado.' });
}