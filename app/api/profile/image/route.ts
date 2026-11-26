import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { updateProfileImageSchema } from '@/lib/validators';

export async function PUT(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sua sessão expirou. Entre novamente para continuar.' }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    scope: 'profile:image',
    key: getRateLimitKey(request, session.user.id),
    max: 10,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas alterações de imagem em pouco tempo.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const body = await request.json();
  const parsed = updateProfileImageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Imagem inválida.' },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      image: parsed.data.image ?? null,
    },
    select: {
      id: true,
      image: true,
    },
  });

  return NextResponse.json({ user });
}
