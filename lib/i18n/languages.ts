import { LANGUAGES, type Language } from '@/lib/i18n/dictionaries';

/**
 * Idiomas oferecidos por país. O público do Gringoou é brasileiro, então o português do Brasil
 * está sempre disponível; os demais idiomas só aparecem quando existe uma região ATIVA no país.
 *
 * Para preparar um país novo, basta mapeá-lo aqui e ter o dicionário em dictionaries.ts.
 * O espanhol já está traduzido e fica oculto até a primeira região da Espanha ser ativada.
 */
export const COUNTRY_LANGUAGES: Record<string, Language[]> = {
  US: ['en-US'],
  CA: ['en-US'],
  PT: ['pt-PT'],
  ES: ['es'],
};

export const DEFAULT_LANGUAGE: Language = 'pt-BR';

/** Idiomas disponíveis para quem tem regiões ativas nos países informados (ordem de LANGUAGES). */
export function getAvailableLanguages(countryCodes: string[]) {
  const offered = new Set<Language>([DEFAULT_LANGUAGE]);
  for (const code of countryCodes) {
    for (const language of COUNTRY_LANGUAGES[code.toUpperCase()] ?? []) offered.add(language);
  }
  return LANGUAGES.filter((language) => offered.has(language.code));
}
