import 'server-only';

import { NextResponse } from 'next/server';
import { MarketplaceRuleError, type MarketplaceErrorCode } from '@/domain/marketplace/rules';

const STATUS_BY_CODE: Record<MarketplaceErrorCode, number> = {
  FORBIDDEN: 403,
  SELF_MODERATION: 403,
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  REASON_REQUIRED: 400,
};

/** Converte erros de regra de negócio em resposta HTTP; relança os demais. */
export function marketplaceErrorResponse(error: unknown): NextResponse {
  if (error instanceof MarketplaceRuleError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: STATUS_BY_CODE[error.code] });
  }
  throw error;
}
