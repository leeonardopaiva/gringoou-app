/**
 * UTM: rastreabilidade de links compartilhados e de CTAs de campanhas pagas.
 *
 * - `UTM_LINK_KINDS` é o catálogo FIXO de pontos de origem (a chave identifica o botão/CTA no código).
 * - Cada ponto tem um padrão aqui; o admin pode sobrescrever (tabela UtmRule, só overrides) sem deploy.
 * - Os valores aceitam variáveis entre chaves: {id} (id do conteúdo), {campanha} (nome da campanha paga),
 *   {posicao} (posição do banner), {regiao}. O resultado é normalizado (minúsculas, sem acento, `_`).
 * - Este arquivo é compartilhado entre cliente e servidor (sem imports de servidor).
 */

export type UtmParams = {
  source: string;
  medium: string;
  campaign: string;
  content?: string | null;
  term?: string | null;
};

export type UtmLinkKind = {
  key: string;
  label: string;
  group: 'Compartilhamento' | 'Campanhas pagas' | 'Convites';
  description: string;
  /** Variáveis disponíveis nos campos deste ponto. */
  variables: string[];
  defaults: UtmParams;
};

export const UTM_LINK_KINDS: UtmLinkKind[] = [
  { key: 'share_marketplace', label: 'Compartilhar anúncio (Marketplace)', group: 'Compartilhamento', description: 'Botão compartilhar na página do anúncio.', variables: ['id', 'regiao'], defaults: { source: 'gringoou', medium: 'share', campaign: 'marketplace', content: '{id}' } },
  { key: 'share_business', label: 'Compartilhar negócio', group: 'Compartilhamento', description: 'Compartilhar/copiar o link da página do negócio.', variables: ['id', 'regiao'], defaults: { source: 'gringoou', medium: 'share', campaign: 'negocio', content: '{id}' } },
  { key: 'share_event', label: 'Compartilhar evento', group: 'Compartilhamento', description: 'Compartilhar/copiar o link da página do evento.', variables: ['id', 'regiao'], defaults: { source: 'gringoou', medium: 'share', campaign: 'evento', content: '{id}' } },
  { key: 'share_news', label: 'Compartilhar notícia', group: 'Compartilhamento', description: 'Compartilhar a notícia (página no Gringoou).', variables: ['id', 'regiao'], defaults: { source: 'gringoou', medium: 'share', campaign: 'noticia', content: '{id}' } },
  { key: 'share_community_post', label: 'Compartilhar publicação da Comunidade', group: 'Compartilhamento', description: 'Compartilhar uma publicação do feed.', variables: ['id', 'regiao'], defaults: { source: 'gringoou', medium: 'share', campaign: 'comunidade', content: '{id}' } },
  { key: 'share_group_post', label: 'Compartilhar publicação de grupo', group: 'Compartilhamento', description: 'Compartilhar uma publicação dentro de um grupo.', variables: ['id', 'regiao'], defaults: { source: 'gringoou', medium: 'share', campaign: 'grupo', content: '{id}' } },
  { key: 'share_public_link', label: 'Link público do perfil', group: 'Compartilhamento', description: 'Copiar/compartilhar links do perfil público.', variables: ['id'], defaults: { source: 'gringoou', medium: 'share', campaign: 'perfil', content: '{id}' } },
  { key: 'referral_invite', label: 'Link de indicação', group: 'Convites', description: 'Link de indicação do usuário (Comunidade e Perfil).', variables: ['id'], defaults: { source: 'gringoou', medium: 'referral', campaign: 'indicacao', content: '{id}' } },
  { key: 'paid_banner_cta', label: 'CTA de campanha paga (banner)', group: 'Campanhas pagas', description: 'Clique no CTA de banners pagos (Home e Comunidade). Vale para o link do anunciante.', variables: ['id', 'campanha', 'posicao', 'regiao'], defaults: { source: 'gringoou', medium: 'paid_banner', campaign: '{campanha}', content: '{posicao}' } },
];

export const UTM_KEYS = UTM_LINK_KINDS.map((kind) => kind.key);

export const getUtmKind = (key: string) => UTM_LINK_KINDS.find((kind) => kind.key === key);

export type UtmRuleOverride = UtmParams & { enabled: boolean };
export type UtmRulesMap = Record<string, UtmRuleOverride>;
export type UtmVars = Partial<Record<'id' | 'campanha' | 'posicao' | 'regiao', string | null | undefined>>;

/** Normaliza um valor de UTM: minúsculas, sem acento, só [a-z0-9_.-]. */
export const sanitizeUtmValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);

const renderTemplate = (template: string, vars: UtmVars) =>
  template.replace(/\{(id|campanha|posicao|regiao)\}/g, (_match, name: keyof UtmVars) => vars[name] ?? '');

export type ResolvedUtm = { enabled: boolean; params: Record<string, string> };

/** Resolve os parâmetros efetivos (override do admin > padrão do código), já renderizados e normalizados. */
export const resolveUtm = (key: string, vars: UtmVars = {}, rules?: UtmRulesMap | null): ResolvedUtm => {
  const kind = getUtmKind(key);
  if (!kind) return { enabled: false, params: {} };
  const override = rules?.[key];
  if (override && !override.enabled) return { enabled: false, params: {} };
  const source = override ?? { ...kind.defaults, enabled: true };
  const entries: Array<[string, string | null | undefined]> = [
    ['utm_source', source.source],
    ['utm_medium', source.medium],
    ['utm_campaign', source.campaign],
    ['utm_content', source.content],
    ['utm_term', source.term],
  ];
  const params: Record<string, string> = {};
  for (const [name, raw] of entries) {
    if (!raw) continue;
    const value = sanitizeUtmValue(renderTemplate(raw, vars));
    if (value) params[name] = value;
  }
  return { enabled: true, params };
};

/** Acrescenta utm_* à URL (absoluta). Não sobrescreve utm_* já presentes e preserva o #hash. URL inválida volta intacta. */
export const appendUtm = (url: string, params: Record<string, string>): string => {
  try {
    const parsed = new URL(url);
    for (const [name, value] of Object.entries(params)) {
      if (!parsed.searchParams.has(name)) parsed.searchParams.set(name, value);
    }
    return parsed.toString();
  } catch {
    return url;
  }
};

/** Monta o link final de um ponto de origem. Sem regra ativa, devolve a URL original. */
export const buildUtmUrl = (key: string, url: string, vars: UtmVars = {}, rules?: UtmRulesMap | null): string => {
  const resolved = resolveUtm(key, vars, rules);
  return resolved.enabled ? appendUtm(url, resolved.params) : url;
};
