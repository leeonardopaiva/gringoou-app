import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const schema = z.object({ adAccountId: z.string().cuid(), ids: z.array(z.string().cuid()).max(100).optional() });

/** Marca alertas como lidos (os informados, ou todos da conta quando `ids` não é enviado). */
export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Entre na sua conta para continuar.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  const membership = await prisma.adAccountUser.findUnique({
    where: { adAccountId_userId: { adAccountId: parsed.data.adAccountId, userId: session.user.id } },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: 'Acesso negado a esta conta.' }, { status: 403 });
  await prisma.adNotification.updateMany({
    where: { adAccountId: parsed.data.adAccountId, readAt: null, ...(parsed.data.ids ? { id: { in: parsed.data.ids } } : {}) },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
