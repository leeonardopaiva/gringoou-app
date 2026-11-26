/**
 * Dados da empresa responsável pelo Gringoou, usados nos Termos de Uso e na Política de Privacidade.
 * Fonte única: atualize aqui e as duas páginas mudam juntas.
 *
 * Fonte dos dados: Certificate of Organization da Gringoou LLC (Connecticut, EUA).
 */
export const LEGAL_ENTITY = {
  name: 'Gringoou LLC',
  legalForm: 'sociedade de responsabilidade limitada (LLC) constituída em Connecticut, Estados Unidos',
  registryId: 'US-CT.BER:3528342',
  address: '72 Merrimac St, Danbury, CT 06810-6466, Estados Unidos',
} as const;

/**
 * Caixas de e-mail de contato. ATENÇÃO: crie estas caixas (ou troque pelos endereços que existirem)
 * antes de publicar. Não use e-mail pessoal de sócio: estes endereços aparecem na página pública.
 */
export const LEGAL_CONTACTS = {
  privacy: 'privacy@gringoou.com',
  legal: 'legal@gringoou.com',
  /** Denúncias de conteúdo ilegal e pedidos de remoção (direitos autorais incluídos). */
  abuse: 'abuse@gringoou.com',
} as const;

/**
 * Preencha quando existirem. Enquanto forem `null`, as páginas NÃO afirmam que o cargo existe.
 * - euRepresentative: representante na União Europeia (art. 27 do GDPR e art. 13 do DSA).
 * - dpo: encarregado/DPO. Obrigatório no Brasil (LGPD) e a avaliar na UE.
 * - dmcaAgent: agente registrado no US Copyright Office para pedidos de remoção por direitos autorais.
 */
export const LEGAL_ROLES: {
  euRepresentative: { name: string; address: string; email: string } | null;
  dpo: { name: string; email: string } | null;
  dmcaAgent: { name: string; email: string } | null;
} = {
  euRepresentative: null,
  dpo: null,
  dmcaAgent: null,
};

/** Versão dos textos. Mude a cada alteração relevante: serve para registrar qual versão cada pessoa aceitou. */
export const LEGAL_VERSION = '2026-11-26';
export const LEGAL_UPDATED_AT = '26 de novembro de 2026';
