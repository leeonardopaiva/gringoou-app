import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { getPasswordValidationIssues } from '@/lib/forms/password';
import { hashPassword, normalizeAuthEmail } from '@/lib/password-auth';
import { verifySimpleCaptcha } from '@/lib/simple-captcha';
import { z } from 'zod';
import { isOperationalFeatureEnabled } from '@/lib/operational-flags';

const registerSchema = z.object({
  email: z.string().trim().email('Informe um email valido.'),
  password: z.string().min(8, 'Use uma senha mais forte.'),
  captchaToken: z.string().min(10),
  captchaAnswer: z.string().trim().min(1, 'Resolva o calculo de verificacao.'),
});

export async function POST(request: Request) {
  if (!isOperationalFeatureEnabled('registration')) {
    return NextResponse.json(
      { error: 'Novos cadastros estao temporariamente pausados.' },
      { status: 503, headers: { 'Retry-After': '300' } },
    );
  }

  const rateLimit = await consumeRateLimit({
    scope: 'auth:register',
    key: getRateLimitKey(request),
    max: 8,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas de cadastro. Aguarde antes de tentar novamente.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados invalidos para cadastro.' },
      { status: 400 },
    );
  }

  if (!verifySimpleCaptcha(parsed.data.captchaToken, parsed.data.captchaAnswer)) {
    return NextResponse.json({ error: 'Captcha invalido ou expirado.' }, { status: 400 });
  }

  const passwordIssues = getPasswordValidationIssues(parsed.data.password);

  if (passwordIssues.length > 0) {
    return NextResponse.json({ error: passwordIssues[0] }, { status: 400 });
  }

  const email = normalizeAuthEmail(parsed.data.email);

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return NextResponse.json({ error: 'Esse email ja esta cadastrado.' }, { status: 409 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(parsed.data.password),
        emailVerificationRequired: true,
      },
      select: {
        id: true,
        email: true,
      },
    });

    return NextResponse.json({
      user,
      message: 'Conta criada. Enviamos um link para confirmar seu email.',
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Esse email ja esta cadastrado.' }, { status: 409 });
    }

    throw error;
  }
}
