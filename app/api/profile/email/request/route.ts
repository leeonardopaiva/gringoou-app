import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { getAppBaseUrl } from '@/lib/app-url';
import {
  canSelfServeEmailChange,
  createEmailChangeToken,
  getEmailChangeExpiry,
  hashEmailChangeToken,
  normalizeEmail,
} from '@/lib/email-change';
import { sendTransactionalEmail } from '@/lib/email-auth';
import { prisma } from '@/lib/prisma';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { requestEmailChangeSchema } from '@/lib/validators';

export const runtime = 'nodejs';

const buildEmailChangeText = (url: string) =>
  [
    'Confirmação de troca de email na Gringoou',
    '',
    'Recebemos um pedido para alterar o email da sua conta.',
    'Use o link abaixo para confirmar a mudança:',
    url,
    '',
    'Se você não solicitou essa troca, ignore este email.',
  ].join('\n');

const buildEmailChangeHtml = (url: string) => `
  <div style="background:#f6f8fc;padding:32px 16px;font-family:Arial,sans-serif;color:#1f2937;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid #e5e7eb;">
      <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#28B8C7;font-weight:700;">
        Gringoou
      </p>
      <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#0f172a;">
        Confirme seu novo email
      </h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
        Clique no botão abaixo para concluir a troca do email da sua conta com segurança.
      </p>
      <a
        href="${url}"
        style="display:inline-block;background:#28B8C7;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:16px;font-weight:700;"
      >
        Confirmar novo email
      </a>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
        Se você não solicitou esta alteração, ignore este email e sua conta continuará igual.
      </p>
    </div>
  </div>
`;

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sua sessão expirou. Entre novamente para continuar.' }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    scope: 'profile:email-request',
    key: getRateLimitKey(request, session.user.id),
    max: 3,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas solicitações de troca de email. Aguarde antes de tentar novamente.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const body = await request.json();
  const parsed = requestEmailChangeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Email inválido.' },
      { status: 400 },
    );
  }

  const nextEmail = normalizeEmail(parsed.data.email);
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!currentUser) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }

  const currentEmail = currentUser.email ? normalizeEmail(currentUser.email) : '';

  if (nextEmail === currentEmail) {
    return NextResponse.json({ error: 'Esse já é o email atual da sua conta.' }, { status: 400 });
  }

  if (!canSelfServeEmailChange(nextEmail, currentUser.role === UserRole.ADMIN)) {
    return NextResponse.json(
      { error: 'Esse email e restrito e não pode ser usado no autoatendimento.' },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      email: nextEmail,
      NOT: {
        id: currentUser.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return NextResponse.json({ error: 'Esse email já está em uso.' }, { status: 409 });
  }

  const rawToken = createEmailChangeToken();
  const tokenHash = hashEmailChangeToken(rawToken);
  const expiresAt = getEmailChangeExpiry();
  const confirmationUrl = `${getAppBaseUrl(request)}/api/profile/email/confirm?token=${rawToken}`;

  await prisma.$transaction([
    prisma.emailChangeToken.deleteMany({
      where: {
        OR: [{ userId: currentUser.id }, { newEmail: nextEmail }],
      },
    }),
    prisma.emailChangeToken.create({
      data: {
        userId: currentUser.id,
        newEmail: nextEmail,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  await sendTransactionalEmail({
    to: nextEmail,
    subject: 'Confirme seu novo email na Gringoou',
    text: buildEmailChangeText(confirmationUrl),
    html: buildEmailChangeHtml(confirmationUrl),
    devLabel: 'Troca de email',
  });

  return NextResponse.json({
    success: true,
    message: 'Enviamos um link de confirmação para o novo email.',
  });
}
