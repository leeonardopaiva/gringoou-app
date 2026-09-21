import { createTransport } from 'nodemailer';
import { join } from 'node:path';
import type { SendVerificationRequestParams } from 'next-auth/providers/email';
import { isDevAuthEnabled, normalizeMagicLinkEmail, saveDevMagicLink } from '@/lib/dev-magic-links';
import { consumeRateLimit } from '@/lib/rate-limit';

const emailServerHost = process.env.EMAIL_SERVER_HOST;
const emailServerPort = process.env.EMAIL_SERVER_PORT;
const emailServerUser = process.env.EMAIL_SERVER_USER;
const emailServerPassword = process.env.EMAIL_SERVER_PASSWORD;

export const emailFrom = process.env.EMAIL_FROM || 'Gringoou <no-reply@gringoou.local>';

export const isEmailServerConfigured = Boolean(
  emailServerHost &&
    emailServerPort &&
    emailServerUser &&
    emailServerPassword &&
    process.env.EMAIL_FROM,
);

export const isEmailAuthConfigured = Boolean(
  process.env.NEXTAUTH_SECRET && (isEmailServerConfigured || isDevAuthEnabled),
);

export const emailProviderServer = {
  host: emailServerHost || 'localhost',
  port: Number(emailServerPort || 25),
  secure: Number(emailServerPort || 25) === 465,
  auth: {
    user: emailServerUser || '',
    pass: emailServerPassword || '',
  },
};

const buildMagicLinkEmailText = (url: string) =>
  [
    'Seu acesso à Gringoou',
    '',
    'Recebemos uma solicitação para acessar sua conta.',
    'Use o link abaixo para entrar com segurança:',
    url,
    '',
    'Este link expira em 15 minutos e só pode ser usado uma vez.',
    'Se você não solicitou esse acesso, ignore este e-mail.',
  ].join('\n');

const escapeEmailHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const buildMagicLinkEmailHtml = (url: string) => {
  const safeUrl = escapeEmailHtml(url);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Seu acesso à Gringoou</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#17324d;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Seu link seguro para entrar na comunidade Gringoou.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f4f6f8;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;">
            <tr>
              <td align="center" style="padding:0 0 24px;">
                <img src="cid:gringoou-logo" width="168" alt="Gringoou" style="display:block;width:168px;max-width:70%;height:auto;border:0;outline:none;text-decoration:none;">
              </td>
            </tr>
            <tr>
              <td style="border-radius:24px;background-color:#ffffff;">
                <div style="padding:42px 38px 36px;text-align:center;">
                  <h1 style="margin:0 0 14px;font-size:26px;line-height:34px;font-weight:800;letter-spacing:-0.4px;color:#123b5d;">Confirme seu e-mail</h1>
                  <p style="margin:0 auto;max-width:420px;font-size:15px;line-height:25px;color:#64788b;">Recebemos uma solicitação para acessar sua conta na Gringoou. Confirme seu e-mail para continuar.</p>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto;">
                    <tr>
                      <td align="center" bgcolor="#0086ff" style="border-radius:999px;background-color:#0086ff;">
                        <a href="${safeUrl}" style="display:inline-block;padding:15px 32px;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;background-color:#0086ff;border-radius:999px;">Confirmar E-mail</a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0;font-size:13px;line-height:21px;color:#7b8d9d;">O link expira em 15 minutos e pode ser utilizado apenas uma vez.</p>
                  <div style="margin-top:26px;border-top:1px solid #edf1f4;padding-top:22px;font-size:12px;line-height:20px;color:#8a9aa8;">Se você não solicitou este acesso, ignore este e-mail. Sua conta continuará protegida.</div>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 24px 0;font-size:12px;line-height:19px;color:#8294a6;">Gringoou · Informação, conexão e oportunidades para brasileiros no exterior.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

type TransactionalEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  devLabel?: string;
  attachments?: Array<{ filename: string; path: string; cid: string }>;
};

const magicLinkLogoAttachment = {
  filename: 'gringoou-logo.png',
  path: join(process.cwd(), 'public', 'assets', 'gringoou-logo.png'),
  cid: 'gringoou-logo',
};

export const sendTransactionalEmail = async ({
  to,
  subject,
  text,
  html,
  devLabel,
  attachments,
}: TransactionalEmailInput) => {
  if (isEmailServerConfigured) {
    const transport = createTransport(emailProviderServer);
    const result = await transport.sendMail({
      to,
      from: emailFrom,
      subject,
      text,
      html,
      attachments,
    });

    const failedRecipients = result.rejected.concat(result.pending).filter(Boolean);

    if (failedRecipients.length > 0) {
      throw new Error(`Nao foi possivel entregar o email para ${failedRecipients.join(', ')}`);
    }

    return;
  }

  if (isDevAuthEnabled) {
    console.log(`[dev-email] ${devLabel || subject} para ${to}`);
    console.log(text);
    return;
  }

  throw new Error(
    'Envio de email indisponivel. Configure SMTP ou habilite DEV_AUTH_ENABLED localmente.',
  );
};

export const sendMagicLinkPreviewEmail = async (to: string) => {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
  const previewUrl = `${appUrl}/login?emailPreview=1`;

  await sendTransactionalEmail({
    to,
    subject: '[TESTE] Confirme seu e-mail na Gringoou',
    text: buildMagicLinkEmailText(previewUrl),
    html: buildMagicLinkEmailHtml(previewUrl),
    devLabel: 'Prévia do magic link',
    attachments: [magicLinkLogoAttachment],
  });
};

export const sendMagicLinkVerification = async ({
  identifier,
  url,
  expires,
}: SendVerificationRequestParams) => {
  const normalizedEmail = normalizeMagicLinkEmail(identifier);
  const rateLimit = await consumeRateLimit({
    scope: 'auth:magic-link',
    key: `email:${normalizedEmail}`,
    max: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    throw new Error('Muitas tentativas de login por email. Aguarde alguns minutos.');
  }

  if (isDevAuthEnabled) {
    saveDevMagicLink(normalizedEmail, url, expires);
    console.log(`[dev-auth] Magic link para ${normalizedEmail}: ${url}`);
    return;
  }

  await sendTransactionalEmail({
    to: normalizedEmail,
    subject: 'Confirme seu e-mail na Gringoou',
    text: buildMagicLinkEmailText(url),
    html: buildMagicLinkEmailHtml(url),
    devLabel: 'Magic link',
    attachments: [magicLinkLogoAttachment],
  });
};
