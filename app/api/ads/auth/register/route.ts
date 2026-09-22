import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPasswordValidationIssues } from '@/lib/forms/password';
import { hashPassword, normalizeAuthEmail } from '@/lib/password-auth';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { normalizeInternationalPhone } from '@/lib/phone';
import { isOperationalFeatureEnabled } from '@/lib/operational-flags';

const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  phone: z.string().trim().min(8).max(30),
});

export async function POST(request: Request) {
  if (!isOperationalFeatureEnabled('registration')) {
    return NextResponse.json(
      { error: 'Novos cadastros estao temporariamente pausados.' },
      { status: 503, headers: { 'Retry-After': '300' } },
    );
  }

  const rateLimit = await consumeRateLimit({ scope: 'ads:register', key: getRateLimitKey(request), max: 8, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde antes de tentar novamente.' }, { status: 429, headers: buildRateLimitHeaders(rateLimit) });
  }

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' }, { status: 400 });
  const passwordIssues = getPasswordValidationIssues(parsed.data.password);
  if (passwordIssues.length) return NextResponse.json({ error: passwordIssues[0] }, { status: 400 });

  const email = normalizeAuthEmail(parsed.data.email);
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (existingUser) {
    return NextResponse.json(
      {
        error: 'Esse e-mail já está cadastrado. Entre com essa conta para continuar.',
        code: 'ACCOUNT_ALREADY_EXISTS',
      },
      { status: 409 },
    );
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: `${parsed.data.firstName} ${parsed.data.lastName}`,
        email,
        passwordHash: await hashPassword(parsed.data.password),
        phone: normalizeInternationalPhone(parsed.data.phone),
        isAdvertiser: true,
      },
      select: { id: true, email: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'Esse e-mail já está cadastrado. Entre com essa conta para continuar.',
          code: 'ACCOUNT_ALREADY_EXISTS',
        },
        { status: 409 },
      );
    }
    throw error;
  }
}
