import type { AdPlan } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type CouponEvaluation =
  | { ok: false; error: string }
  | { ok: true; couponId: string; discountCents: number; payCents: number; full: boolean };

/**
 * Confere um cupom e calcula o desconto. Sem valor definido (creditCents nulo) o cupom cobre o pacote inteiro
 * (cortesia); com valor, é um crédito promocional e o restante é pago pelo cartão.
 */
export async function evaluateAdCoupon(input: { code: string; plan: AdPlan; adAccountId: string; userEmail?: string | null; totalCents: number }): Promise<CouponEvaluation> {
  const row = await prisma.adCoupon.findUnique({ where: { code: input.code.trim().toUpperCase() }, include: { _count: { select: { redemptions: true } } } });
  if (!row || !row.isActive) return { ok: false, error: 'Cupom inválido ou desativado.' };
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return { ok: false, error: 'Este cupom expirou.' };
  if (row.plan && row.plan !== input.plan) return { ok: false, error: 'Este cupom não vale para o pacote escolhido.' };
  if (row.assignedEmail && row.assignedEmail.toLowerCase() !== (input.userEmail ?? '').toLowerCase()) return { ok: false, error: 'Este cupom foi emitido para outra pessoa.' };
  if (row._count.redemptions >= row.maxRedemptions) return { ok: false, error: 'Este cupom já atingiu o limite de usos.' };
  const already = await prisma.adCouponRedemption.findUnique({ where: { adAccountId: input.adAccountId }, select: { id: true } });
  if (already) return { ok: false, error: 'Esta conta já usou um cupom. Contrate o pacote pelo pagamento normal.' };
  const discountCents = row.creditCents ? Math.min(row.creditCents, input.totalCents) : input.totalCents;
  const payCents = input.totalCents - discountCents;
  return { ok: true, couponId: row.id, discountCents, payCents, full: payCents === 0 };
}
