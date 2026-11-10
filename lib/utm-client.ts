'use client';

import { useEffect } from 'react';
import { buildUtmUrl, type UtmRulesMap, type UtmVars } from '@/lib/utm';

/**
 * Cliente de UTM: busca uma vez os overrides do admin (/api/utm/rules) e monta os links.
 * Se a busca falhar ou ainda não terminou, usa os padrões do código: o link nunca fica sem UTM por causa de rede.
 */
let rulesCache: UtmRulesMap | null = null;
let rulesPromise: Promise<void> | null = null;

export const prefetchUtmRules = () => {
  rulesPromise ??= fetch('/api/utm/rules')
    .then((response) => (response.ok ? response.json() : null))
    .then((payload) => {
      if (payload?.rules) rulesCache = payload.rules as UtmRulesMap;
    })
    .catch(() => undefined);
  return rulesPromise;
};

/** Monta o link com UTM para um ponto de origem. Aceita caminho relativo (usa a origem atual) ou URL absoluta. */
export const withUtm = (key: string, url: string, vars: UtmVars = {}) => {
  const absolute = url.startsWith('/') && typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;
  return buildUtmUrl(key, absolute, vars, rulesCache);
};

/** Chame uma vez nas telas que geram links, para os overrides já estarem carregados no clique. */
export const useUtmRules = () => {
  useEffect(() => {
    void prefetchUtmRules();
  }, []);
};
