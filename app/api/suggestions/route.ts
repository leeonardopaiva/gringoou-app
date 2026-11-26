import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { suggestionSchema } from '@/lib/validators';

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sua sessão expirou. Entre novamente para continuar.' }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    scope: 'suggestion:create',
    key: getRateLimitKey(request, session.user.id),
    max: 5,
    windowMs: 24 * 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Você já enviou muitas sugestões hoje. Tente novamente amanha.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const body = await request.json();
  const parsed = suggestionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos para a sugestão.' },
      { status: 400 },
    );
  }

  const suggestion = await prisma.suggestion.create({
    data: {
      category: parsed.data.category,
      message: parsed.data.message,
      userId: session.user.id,
    },
    select: {
      id: true,
      category: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    suggestion,
    message: 'Sugestão enviada com sucesso.',
  });
}
