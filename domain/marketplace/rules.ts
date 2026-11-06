/**
 * Regras de negócio de status/moderação do Marketplace.
 *
 * PURAS — sem dependências de React, Next, NextAuth ou Prisma.
 */
import type { MarketplaceStatus } from './entities/marketplace.entity';

export type MarketplaceErrorCode =
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'REASON_REQUIRED'
  | 'SELF_MODERATION';

export class MarketplaceRuleError extends Error {
  constructor(
    public readonly code: MarketplaceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MarketplaceRuleError';
  }
}

export type ModerationDecision = 'APPROVE' | 'REJECT' | 'REMOVE';

export const MIN_REASON_LENGTH = 5;

/** Estados que o dono pode alternar livremente entre si (anúncio já aprovado). */
const OWNER_TOGGLE_STATUSES: MarketplaceStatus[] = ['ACTIVE', 'SOLD', 'UNAVAILABLE'];

/**
 * Resolve o próximo status quando o PROPRIETÁRIO edita um anúncio.
 *
 * - O dono nunca consegue aprovar: `ACTIVE` só é aceito a partir de SOLD/UNAVAILABLE
 *   (anúncio que já foi aprovado antes).
 * - Editar o conteúdo de um anúncio REJECTED o reenvia para revisão.
 * - Anúncio REMOVED (decisão de moderação) não pode ser alterado pelo dono.
 *
 * Retorna o status a gravar, ou `undefined` para manter o atual.
 */
export function resolveOwnerStatus(
  current: MarketplaceStatus,
  requested: MarketplaceStatus | undefined,
  contentChanged: boolean,
): MarketplaceStatus | undefined {
  if (current === 'REMOVED') {
    throw new MarketplaceRuleError('FORBIDDEN', 'Este anúncio foi removido pela moderação.');
  }

  if (requested === undefined || requested === current) {
    if (current === 'REJECTED') {
      if (!contentChanged) {
        throw new MarketplaceRuleError('INVALID_TRANSITION', 'Edite o anúncio para reenviá-lo à revisão.');
      }
      return 'PENDING_REVIEW';
    }
    return undefined;
  }

  const fromToggleable = OWNER_TOGGLE_STATUSES.includes(current);
  const toToggleable = OWNER_TOGGLE_STATUSES.includes(requested);

  // ACTIVE só a partir de SOLD/UNAVAILABLE; ACTIVE -> SOLD/UNAVAILABLE e vice-versa.
  if (fromToggleable && toToggleable) return requested;

  throw new MarketplaceRuleError('INVALID_TRANSITION', 'Mudança de status não permitida.');
}

/** Resolve o status resultante de uma decisão de moderação. */
export function resolveModerationStatus(
  current: MarketplaceStatus,
  decision: ModerationDecision,
  reason: string | null,
): MarketplaceStatus {
  const trimmed = reason?.trim() ?? '';

  switch (decision) {
    case 'APPROVE':
      if (current !== 'PENDING_REVIEW') {
        throw new MarketplaceRuleError('INVALID_TRANSITION', 'Apenas anúncios pendentes podem ser aprovados.');
      }
      return 'ACTIVE';
    case 'REJECT':
      if (current !== 'PENDING_REVIEW' && current !== 'ACTIVE') {
        throw new MarketplaceRuleError('INVALID_TRANSITION', 'Este anúncio não pode ser rejeitado no estado atual.');
      }
      if (trimmed.length < MIN_REASON_LENGTH) {
        throw new MarketplaceRuleError('REASON_REQUIRED', 'Informe o motivo da rejeição.');
      }
      return 'REJECTED';
    case 'REMOVE':
      if (current === 'REMOVED') {
        throw new MarketplaceRuleError('INVALID_TRANSITION', 'O anúncio já foi removido.');
      }
      if (trimmed.length < MIN_REASON_LENGTH) {
        throw new MarketplaceRuleError('REASON_REQUIRED', 'Informe o motivo da remoção.');
      }
      return 'REMOVED';
  }
}

/** Ninguém modera o próprio anúncio. */
export function assertNotSelfModeration(ownerId: string, moderatorId: string): void {
  if (ownerId === moderatorId) {
    throw new MarketplaceRuleError('SELF_MODERATION', 'Você não pode moderar o seu próprio anúncio.');
  }
}
