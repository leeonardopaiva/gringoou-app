import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/** Alertas do painel de uma conta de anúncios (só para quem tem acesso à conta). */
export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Entre na sua conta para continuar.' }, { status: 401 });
  const adAccountId = new URL(request.url).searchParams.get('adAccountId');
  if (!adAccountId) return NextResponse.json({ items: [], unread: 0 });
  const membership = await prisma.adAccountUser.findUnique({
    where: { adAccountId_userId: { adAccountId, userId: session.user.id } },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: 'Acesso negado a esta conta.' }, { status: 403 });
  const [items, unread] = await Promise.all([
    prisma.adNotification.findMany({ where: { adAccountId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.adNotification.count({ where: { adAccountId, readAt: null } }),
  ]);
  return NextResponse.json({ items, unread }, { headers: { 'Cache-Control': 'no-store' } });
}
