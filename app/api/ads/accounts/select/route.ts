import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AD_ACCOUNT_COOKIE } from '@/lib/ads/account';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const selectSchema = z.object({ adAccountId: z.string().cuid() });

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const parsed = selectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Conta comercial inválida.' }, { status: 400 });

  const membership = await prisma.adAccountUser.findUnique({
    where: { adAccountId_userId: { adAccountId: parsed.data.adAccountId, userId: session.user.id } },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: 'Acesso negado a esta conta.' }, { status: 403 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AD_ACCOUNT_COOKIE, parsed.data.adAccountId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
