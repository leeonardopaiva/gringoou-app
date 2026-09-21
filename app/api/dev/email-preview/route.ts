import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendMagicLinkPreviewEmail } from '@/lib/email-auth';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';

const previewSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.').max(254),
});

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production' || process.env.EMAIL_TEST_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Envio de teste indisponível.' }, { status: 404 });
  }

  const rateLimit = await consumeRateLimit({
    scope: 'dev:email-preview',
    key: getRateLimitKey(request),
    max: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Limite de e-mails de teste atingido.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const parsed = previewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dados inválidos.' }, { status: 400 });
  }

  try {
    await sendMagicLinkPreviewEmail(parsed.data.email.toLowerCase());
    return NextResponse.json({ message: 'E-mail de teste enviado.' });
  } catch (error) {
    console.error('Email preview failed:', error);
    return NextResponse.json({ error: 'Não foi possível enviar o e-mail de teste.' }, { status: 502 });
  }
}
