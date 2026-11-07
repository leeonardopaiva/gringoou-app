import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit } from '@/lib/rate-limit';

const bodySchema = z.object({ userId: z.string().min(1).max(64) });

async function guard() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  const rateLimit = await consumeRateLimit({ scope: 'blocks', key: `user:${session.user.id}`, max: 60, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return { error: NextResponse.json({ error: 'Muitas ações em pouco tempo. Tente mais tarde.' }, { status: 429, headers: buildRateLimitHeaders(rateLimit) }) } as const;
  }
  return { userId: session.user.id } as const;
}

/** Bloqueia uma pessoa: nenhuma das duas consegue enviar mensagem à outra. */
export async function POST(request: Request) {
  const guarded = await guard();
  if ('error' in guarded) return guarded.error;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Pessoa inválida.' }, { status: 400 });
  if (parsed.data.userId === guarded.userId) {
    return NextResponse.json({ error: 'Você não pode bloquear a si mesmo.' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: 'Pessoa não encontrada.' }, { status: 404 });

  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: guarded.userId, blockedId: target.id } },
    create: { blockerId: guarded.userId, blockedId: target.id },
    update: {},
  });
  return NextResponse.json({ blocked: true });
}

/** Desbloqueia. */
export async function DELETE(request: Request) {
  const guarded = await guard();
  if ('error' in guarded) return guarded.error;

  const userId = new URL(request.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Pessoa inválida.' }, { status: 400 });

  await prisma.userBlock.deleteMany({ where: { blockerId: guarded.userId, blockedId: userId } });
  return NextResponse.json({ blocked: false });
}
