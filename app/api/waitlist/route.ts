import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { waitlistSchema } from '@/lib/waitlist';

export const runtime = 'nodejs';

const SUCCESS_MESSAGE = 'Pronto! Voce esta na lista. Avisaremos por email assim que liberarmos o seu acesso.';

export async function POST(request: Request) {
  const rateLimit = await consumeRateLimit({
    scope: 'waitlist:create',
    key: getRateLimitKey(request),
    max: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = waitlistSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' },
      { status: 400 },
    );
  }

  // Bot filled the honeypot: pretend success without storing anything.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE });
  }

  // Upsert with an empty update keeps the original signup date and status, and
  // gives the same answer whether or not the email was already on the list.
  await prisma.waitlistEntry.upsert({
    where: { email: parsed.data.email },
    create: {
      email: parsed.data.email,
      name: parsed.data.name || null,
      country: parsed.data.country || null,
    },
    update: {},
  });

  return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE });
}
