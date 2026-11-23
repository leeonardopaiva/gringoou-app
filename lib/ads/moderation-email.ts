import 'server-only';

import { sendTransactionalEmail } from '@/lib/email-auth';
import { prisma } from '@/lib/prisma';

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] ?? character);

export async function sendAdModerationEmail(
  bannerId: string,
  outcome: 'APPROVED' | 'REJECTED',
  rejectionReason?: string,
) {
  const campaign = await prisma.banner.findUnique({
    where: { id: bannerId },
    select: {
      headline: true,
      name: true,
      createdBy: { select: { email: true, name: true } },
      adAccount: {
        select: {
          name: true,
          users: {
            where: { role: 'BUSINESS_ADMIN' },
            take: 1,
            select: { user: { select: { email: true, name: true } } },
          },
        },
      },
    },
  });

  if (!campaign) return;
  const recipient = campaign.createdBy?.email ?? campaign.adAccount?.users[0]?.user.email;
  if (!recipient) return;

  const recipientName = campaign.createdBy?.name ?? campaign.adAccount?.users[0]?.user.name ?? 'anunciante';
  const campaignName = campaign.headline || campaign.name;
  const adsUrl = `${process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://www.gringoou.com'}/ads/overview`;
  const approved = outcome === 'APPROVED';
  const subject = approved ? `Anúncio aprovado: ${campaignName}` : `Ajustes necessários: ${campaignName}`;
  const reasonText = rejectionReason?.trim() || 'O criativo precisa ser ajustado para atender as diretrizes de publicidade.';
  const text = approved
    ? `Olá, ${recipientName}. Seu anúncio "${campaignName}" foi aprovado e já pode ser veiculado. Acompanhe em ${adsUrl}`
    : `Olá, ${recipientName}. Seu anúncio "${campaignName}" precisa de ajustes. Motivo: ${reasonText}. Corrija o criativo e envie novamente em ${adsUrl}`;
  const html = `
    <div style="background:#f6f8fc;padding:32px 16px;font-family:Arial,sans-serif;color:#1f2937;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:24px;padding:32px;border:1px solid #e5e7eb;">
        <p style="margin:0 0 12px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#0ea5e9;font-weight:700;">Gringoou Ads</p>
        <h1 style="margin:0 0 12px;font-size:24px;color:#0f172a;">${approved ? 'Seu anúncio foi aprovado' : 'Seu anúncio precisa de ajustes'}</h1>
        <p style="margin:0 0 18px;line-height:1.6;color:#475569;">Olá, ${escapeHtml(recipientName)}. Revisamos <strong>${escapeHtml(campaignName)}</strong>.</p>
        ${approved ? '' : `<div style="margin:0 0 20px;padding:16px;border-radius:16px;background:#fff7ed;color:#9a3412;"><strong>Motivo:</strong> ${escapeHtml(reasonText)}</div>`}
        <a href="${escapeHtml(adsUrl)}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:700;">Ver meus anúncios</a>
      </div>
    </div>`;

  await sendTransactionalEmail({ to: recipient, subject, text, html, devLabel: `Moderação de anúncio: ${outcome}` });
}
