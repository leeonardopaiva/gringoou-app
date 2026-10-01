// Configurações da aplicação Gringoou
// Centraliza constantes e flags que antes estavam espalhadas em App.tsx e outros locais.

// ─── Auth Flags ───────────────────────────────────────────
export const GOOGLE_AUTH_ENABLED =
  process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== 'false';
export const EMAIL_AUTH_ENABLED =
  process.env.NEXT_PUBLIC_EMAIL_AUTH_ENABLED === 'true';
export const PASSWORD_AUTH_ENABLED = true;
export const DEV_AUTH_ENABLED =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === 'true';
export const MOCK_LOGIN_ENABLED =
  DEV_AUTH_ENABLED && process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

// ─── Storage Keys ─────────────────────────────────────────
export const PERSONA_MODE_STORAGE_KEY = 'gringoou:persona-mode';
export const BUSINESS_PROFILE_STORAGE_KEY = 'gringoou:business-profile-id';

// ─── Routes / Public Paths ────────────────────────────────
export const RESERVED_PUBLIC_ROUTES = new Set([
  'admin',
  'inicio',
  'community',
  'marketplace',
  'moradia',
  'buscar',
  'noticias',
  'eventos',
  'negocios',
  'perfil',
  'profile',
  'profissional',
  'vagas',
  'convite',
  'grupos',
]);

// ─── Middleware ────────────────────────────────────────────
export const CANONICAL_HOST = 'gringoou.com';
export const REDIRECT_HOSTS = new Set([
  'emigrei.com',
  'www.emigrei.com',
]);

export const PUBLIC_ASSET_PREFIXES = [
  '/_next/',
  '/assets/',
  '/favicon',
  '/robots.txt',
  '/sitemap.xml',
  '/icon',
  '/apple-icon',
  '/manifest.webmanifest',
  '/api/health',
];

export const PUBLIC_AUTH_PATHS = [
  '/api/auth',
  '/login',
  '/landing',
  '/access-blocked',
  '/maintenance',
  '/styleguide',
  '/ads/login',
  '/ads/register',
  '/api/ads/auth/register',
  '/api/dev/email-preview',
  '/api/dev/magic-link',
];

// ─── Limits ────────────────────────────────────────────────
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 horas
export const COMMUNITY_POSTS_PER_PAGE = 5;
export const EVENTS_PER_PAGE = 24;
export const BUSINESSES_PER_PAGE = 24;