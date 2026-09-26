import 'server-only';

/**
 * Single, centralized switch for local mock mode. Every mock domain module
 * and every service/route that decides between mock and real data reads
 * this one flag — never `process.env` directly.
 */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';
