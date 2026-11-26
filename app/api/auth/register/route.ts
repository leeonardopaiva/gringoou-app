import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LEGAL_VERSION } from '@/lib/legal/company';
import { isRequestGeoBlocked } from '@/lib/geo-access';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { getPasswordValidationIssues } from '@/lib/forms/password';
import { hashPassword, normalizeAuthEmail } from '@/lib/password-auth';
import { verifySimpleCaptcha } from '@/lib/simple-captcha';
import { verifyPhoneProof } from '@/lib/phone-proof';
import { getAccessCountry, getPhoneCountry, isPhoneVerificationConfigured, isPhoneVerificationEnabled } from '@/lib/phone-verification';
import { z } from 'zod';
import { isOperationalFeatureEnabled } from '@/lib/operational-flags';
import { consumeInviteInTx, isInviteOnlyRegistration } from '@/lib/invites';

const registerSchema = z.object({
  email: z.string().trim().email('Informe um email valido.'),
  password: z.string().min(8, 'Use uma senha mais forte.'),
  // Com a verificação por telefone ativa, o captcha foi resolvido no passo do telefone e a prova do SMS o substitui.
  captchaToken: z.string().optional(),
  captchaAnswer: z.string().trim().optional(),
  phoneToken: z.string().max(2000).optional(),
  inviteCode: z.string().trim().optional(),
});

export async function POST(request: Request) {
  if (!isOperationalFeatureEnabled('registration')) {
    return NextResponse.json(
      { error: 'Novos cadastros estão temporariamente pausados.' },
      { status: 503, headers: { 'Retry-After': '300' } },
    );
  }

  if (await isRequestGeoBlocked(request)) {
    return NextResponse.json({ error: 'Gringoou ainda não está disponível na sua região.' }, { status: 403 });
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
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos para cadastro.' },
      { status: 400 },
    );
  }

  // Cadastro que começa pelo telefone: exige a prova assinada de que o SMS foi confirmado.
  const phoneFirst = isPhoneVerificationEnabled() && isPhoneVerificationConfigured;
  let verifiedPhone: string | null = null;

  if (phoneFirst) {
    verifiedPhone = verifyPhoneProof(parsed.data.phoneToken);
    if (!verifiedPhone) {
      return NextResponse.json({ error: 'Confirme seu telefone para continuar. Se demorou, peça um novo código.' }, { status: 400 });
    }
  } else if (!verifySimpleCaptcha(parsed.data.captchaToken ?? '', parsed.data.captchaAnswer ?? '')) {
    return NextResponse.json({ error: 'Verificação incorreta ou expirada. Resolva a nova conta mostrada e tente novamente.' }, { status: 400 });
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
    return NextResponse.json({ error: 'Esse email já está cadastrado.' }, { status: 409 });
  }

  // Private Beta: novos cadastros exigem convite válido.
  const inviteRequired = isInviteOnlyRegistration();
  if (inviteRequired && !parsed.data.inviteCode) {
    return NextResponse.json(
      { error: 'O cadastro está em fase de convite. Informe o código do convite.' },
      { status: 403 },
    );
  }

  try {
    // Cria o usuário e consome o convite de forma atômica (se exigido).
    const user = await prisma.$transaction(async (tx) => {
      if (verifiedPhone) {
        const phoneTaken = await tx.user.findFirst({ where: { phone: verifiedPhone, phoneVerifiedAt: { not: null } }, select: { id: true } });
        if (phoneTaken) throw new PhoneTakenError();
      }

      const created = await tx.user.create({
        data: {
          email,
          passwordHash: await hashPassword(parsed.data.password),
          emailVerificationRequired: true,
          // O cadastro mostra o aviso "ao se cadastrar, você concorda" com os Termos e a Política.
          termsAcceptedAt: new Date(),
          termsVersion: LEGAL_VERSION,
          ...(verifiedPhone
            ? { phone: verifiedPhone, phoneVerifiedAt: new Date(), phoneCountry: getPhoneCountry(verifiedPhone), accessCountry: getAccessCountry(request) }
            : {}),
        },
        select: {
          id: true,
          email: true,
        },
      });

      if (inviteRequired && parsed.data.inviteCode) {
        const consumed = await consumeInviteInTx(tx, parsed.data.inviteCode, email, created.id);
        if (!consumed.ok) {
          throw new InviteRejectedError(consumed.error ?? 'Convite inválido.');
        }
      }

      return created;
    });

    return NextResponse.json({
      user,
      message: 'Conta criada. Enviamos um link para confirmar seu email.',
    });
  } catch (error) {
    if (error instanceof PhoneTakenError) {
      return NextResponse.json({ error: 'Este telefone já está vinculado a uma conta. Entre com ela.' }, { status: 409 });
    }

    if (error instanceof InviteRejectedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Esse email já está cadastrado.' }, { status: 409 });
    }

    throw error;
  }
}

class InviteRejectedError extends Error {}
class PhoneTakenError extends Error {}
