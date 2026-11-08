import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const POLICIES = ['EVERYONE', 'FRIENDS', 'NOBODY'] as const;

/** Quem pode me enviar mensagem direta. */
export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { messagePolicy: true } });
  return NextResponse.json({ messagePolicy: user?.messagePolicy ?? 'EVERYONE' });
}

export async function PATCH(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const policy = POLICIES.find((value) => value === body?.messagePolicy);
  if (!policy) {
    return NextResponse.json({ error: 'Opção inválida.' }, { status: 400 });
  }
  await prisma.user.update({ where: { id: session.user.id }, data: { messagePolicy: policy } });
  return NextResponse.json({ messagePolicy: policy });
}
