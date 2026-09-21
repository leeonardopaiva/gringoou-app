import { createTransport } from 'nodemailer';
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
  <body style="margin:0;padding:0;background-color:#f3f7fb;font-family:Arial,Helvetica,sans-serif;color:#17324d;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Seu link seguro para entrar na comunidade Gringoou.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f3f7fb;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;">
            <tr>
              <td align="center" style="padding:0 0 20px;">
                <span style="font-size:30px;line-height:36px;font-weight:800;letter-spacing:-1.2px;color:#0f4c81;">Gringo<span style="color:#28b8c7;">ou</span></span>
                <div style="margin-top:6px;font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#6b8299;">Comunidade brasileira no exterior</div>
              </td>
            </tr>
            <tr>
              <td style="overflow:hidden;border:1px solid #dce8f2;border-radius:24px;background-color:#ffffff;box-shadow:0 12px 32px rgba(15,76,129,0.08);">
                <div style="height:8px;background-color:#28b8c7;"></div>
                <div style="padding:38px 36px 34px;">
                  <div style="display:inline-block;margin-bottom:20px;border-radius:999px;background-color:#e9f9fb;padding:8px 13px;font-size:12px;font-weight:700;color:#167d8a;">Acesso seguro</div>
                  <h1 style="margin:0 0 14px;font-size:28px;line-height:36px;font-weight:800;letter-spacing:-0.5px;color:#123b5d;">Seu link de acesso chegou</h1>
                  <p style="margin:0;font-size:16px;line-height:26px;color:#50677d;">Recebemos uma solicitação para entrar na sua conta. Use o botão abaixo para continuar com segurança.</p>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
                    <tr>
                      <td align="center" bgcolor="#0f4c81" style="border-radius:999px;">
                        <a href="${safeUrl}" style="display:inline-block;padding:15px 28px;font-size:16px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;">Entrar na Gringoou</a>
                      </td>
                    </tr>
                  </table>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-radius:16px;background-color:#f3fafb;">
                    <tr>
                      <td style="padding:16px 18px;font-size:13px;line-height:20px;color:#50677d;"><strong style="color:#167d8a;">Este link expira em 15 minutos</strong> e só pode ser utilizado uma vez.</td>
                    </tr>
                  </table>
                  <p style="margin:24px 0 8px;font-size:13px;line-height:20px;color:#71869a;">Se o botão não funcionar, copie e cole este endereço no navegador:</p>
                  <p style="margin:0;word-break:break-all;font-size:12px;line-height:18px;color:#0f6f91;"><a href="${safeUrl}" style="color:#0f6f91;text-decoration:underline;">${safeUrl}</a></p>
                  <div style="margin-top:28px;border-top:1px solid #e6edf3;padding-top:22px;font-size:13px;line-height:21px;color:#71869a;">Se você não solicitou este acesso, pode ignorar este e-mail. Sua conta continuará protegida.</div>
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
};

export const sendTransactionalEmail = async ({
  to,
  subject,
  text,
  html,
  devLabel,
}: TransactionalEmailInput) => {
  if (isEmailServerConfigured) {
    const transport = createTransport(emailProviderServer);
    const result = await transport.sendMail({
      to,
      from: emailFrom,
      subject,
      text,
      html,
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
    subject: 'Seu link de acesso para a Gringoou',
    text: buildMagicLinkEmailText(url),
    html: buildMagicLinkEmailHtml(url),
    devLabel: 'Magic link',
  });
};
