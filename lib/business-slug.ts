import { slugify } from '@/lib/slug';

const RESERVED_BUSINESS_SLUGS = new Set([
  'admin', 'api', 'ads', 'buscar', 'community', 'eventos', 'grupos', 'inicio', 'login',
  'marketplace', 'moradia', 'negocios', 'perfil', 'profile', 'profissional', 'vagas',
]);

export const normalizeBusinessSlug = (value: string) => slugify(value).slice(0, 50);

export const validateBusinessSlug = (value: string) => {
  const slug = normalizeBusinessSlug(value);
  if (slug.length < 3) return { error: 'A URL precisa ter ao menos 3 caracteres.' };
  if (RESERVED_BUSINESS_SLUGS.has(slug)) return { error: 'Esta URL é reservada pela plataforma.' };
  return { slug };
};
