
/**
 * Captura de UTM de chegada: guarda os utm_* da URL (última origem, válida por 30 dias) para anexar aos eventos de analytics.
 * Tudo no navegador (localStorage); sem dados pessoais. Falhas de storage são ignoradas.
 */
const STORAGE_KEY = 'gringoou_utm';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const UTM_NAMES = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

export type StoredUtm = Partial<Record<(typeof UTM_NAMES)[number], string>>;

export const captureUtmFromLocation = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const found: StoredUtm = {};
    for (const name of UTM_NAMES) {
      const value = params.get(name)?.trim().slice(0, 100);
      if (value) found[name] = value;
    }
    if (Object.keys(found).length === 0) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ utm: found, at: Date.now() }));
  } catch {
    // storage indisponível: sem atribuição, sem erro
  }
};

export const getStoredUtm = (): StoredUtm | undefined => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { utm?: StoredUtm; at?: number };
    if (!parsed.utm || !parsed.at || Date.now() - parsed.at > TTL_MS) return undefined;
    return parsed.utm;
  } catch {
    return undefined;
  }
};
