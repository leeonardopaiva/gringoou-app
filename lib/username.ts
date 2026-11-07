import { slugify } from '@/lib/slug';

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'cadastro',
  'community',
  'configuracoes',
  'conta',
  'email',
  'entrar',
  'eventos',
  'businesses',
  'events',
  'jobs',
  'housing',
  'groups',
  'search',
  'explorar',
  'feed',
  'home',
  'login',
  'marketplace',
  'moradia',
  'negocios',
  'invites',
  'noticias',
  'news',
  'inicio',
  'convite',
  'onboarding',
  'perfil',
  'planos',
  'politica',
  'premium',
  'profissional',
  'privacy',
  'profile',
  'regiao',
  'regioes',
  'register',
  'root',
  'settings',
  'signin',
  'signup',
  'suporte',
  'termos',
  'terms',
  'teste',
  'user',
  'usuarios',
  'vagas',
]);

export const normalizeUsernameInput = (value: string) =>
  slugify(value).slice(0, USERNAME_MAX_LENGTH);

export const isReservedUsername = (value: string) =>
  RESERVED_USERNAMES.has(value.trim().toLowerCase());

export const validateUsernameValue = (value: string) => {
  const normalized = normalizeUsernameInput(value);

  if (normalized.length < USERNAME_MIN_LENGTH) {
    return {
      normalized,
      error: 'Use ao menos 3 caracteres para seu nome publico.',
    };
  }

  if (normalized.length > USERNAME_MAX_LENGTH) {
    return {
      normalized,
      error: `Use no maximo ${USERNAME_MAX_LENGTH} caracteres.`,
    };
  }

  if (!USERNAME_PATTERN.test(normalized)) {
    return {
      normalized,
      error: 'Use apenas letras minusculas, numeros e hifens.',
    };
  }

  if (isReservedUsername(normalized)) {
    return {
      normalized,
      error: 'Esse nome esta reservado pela plataforma.',
    };
  }

  return {
    normalized,
    error: null,
  };
};

