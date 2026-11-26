import 'server-only';

import { sendTransactionalEmail } from '@/lib/email-auth';

/**
 * E-mail de "seu acesso foi liberado", enviado a quem está na lista de espera.
 * Curto, com um único botão (o convite já vai no link) e o motivo de a pessoa estar recebendo.
 */

const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const getAppUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');

export const buildAccessInviteUrl = (code: string, email: string) =>
  `${getAppUrl()}/login?invite=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}`;

const firstName = (name?: string | null) => name?.trim().split(/\s+/)[0] || null;

const formatDate = (date: Date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

export const buildAccessGrantedEmail = ({ name, url, expiresAt }: { name?: string | null; url: string; expiresAt?: Date | null }) => {
  const greeting = firstName(name) ? `${firstName(name)}, seu acesso foi liberado` : 'Seu acesso foi liberado';
  const expiry = expiresAt ? `Este convite vale até ${formatDate(expiresAt)} e é só seu.` : 'Este convite é só seu.';

  const text = [
    `${greeting}!`,
    '',
    'Você estava na lista de espera do Gringoou e agora já pode entrar na comunidade brasileira da sua região.',
    '',
    `Criar minha conta: ${url}`,
    '',
    expiry,
    'Você recebeu este e-mail porque entrou na lista de espera do Gringoou. Se não foi você, é só ignorar.',
  ].join('\n');

  const safeUrl = escapeHtml(url);
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Seu acesso ao Gringoou foi liberado</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#17324d;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Entre agora na comunidade brasileira da sua região.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f4f6f8;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;">
            <tr>
              <td style="border-radius:24px;background-color:#ffffff;">
                <div style="padding:42px 38px 36px;text-align:center;">
                  <img src="https://www.gringoou.com/assets/gringoou-logo.png" width="168" alt="Gringoou" style="display:block;width:168px;max-width:70%;height:auto;margin:0 auto 30px;border:0;outline:none;text-decoration:none;">
                  <h1 style="margin:0 0 14px;font-size:26px;line-height:34px;font-weight:800;letter-spacing:-0.4px;color:#123b5d;">${escapeHtml(greeting)}!</h1>
                  <p style="margin:0 auto;max-width:420px;font-size:15px;line-height:25px;color:#64788b;">Você estava na lista de espera e agora já pode entrar na comunidade brasileira da sua região: notícias, vagas, eventos e gente de confiança por perto.</p>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto;">
                    <tr>
                      <td align="center" bgcolor="#0086ff" style="border-radius:999px;background-color:#0086ff;">
                        <a href="${safeUrl}" style="display:inline-block;padding:15px 32px;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;background-color:#0086ff;border-radius:999px;">Criar minha conta</a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0;font-size:13px;line-height:21px;color:#7b8d9d;">${escapeHtml(expiry)}</p>
                  <div style="margin-top:26px;border-top:1px solid #edf1f4;padding-top:22px;font-size:12px;line-height:20px;color:#8a9aa8;">Você recebeu este e-mail porque entrou na lista de espera do Gringoou. Se não foi você, é só ignorar.</div>
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

  return { subject: 'Seu acesso ao Gringoou foi liberado', text, html };
};

export const sendAccessGrantedEmail = async ({
  to,
  name,
  code,
  expiresAt,
}: {
  to: string;
  name?: string | null;
  code: string;
  expiresAt?: Date | null;
}) => {
  const message = buildAccessGrantedEmail({ name, url: buildAccessInviteUrl(code, to), expiresAt });
  await sendTransactionalEmail({ to, ...message, devLabel: 'Acesso liberado' });
};
