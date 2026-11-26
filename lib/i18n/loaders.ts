import type { Language } from '@/lib/i18n/dictionaries';

export type TextDictionary = Record<string, string>;

/**
 * Pacotes de tradução por texto, gerados por `npm run i18n:split` a partir de lib/i18n/translations.
 * - núcleo: app e landing (vai junto da primeira tela);
 * - painéis: só admin e anúncios (carregado apenas nessas telas).
 * O português do Brasil é o texto original do código e não precisa de arquivo.
 */
export const loadCoreDictionary = async (language: Language): Promise<TextDictionary> => {
  switch (language) {
    case 'en-US':
      return (await import('@/lib/i18n/generated/core.en-US.json')).default as TextDictionary;
    case 'es':
      return (await import('@/lib/i18n/generated/core.es.json')).default as TextDictionary;
    case 'pt-PT':
      return (await import('@/lib/i18n/generated/core.pt-PT.json')).default as TextDictionary;
    default:
      return {};
  }
};

export const loadPanelsDictionary = async (language: Language): Promise<TextDictionary> => {
  switch (language) {
    case 'en-US':
      return (await import('@/lib/i18n/generated/panels.en-US.json')).default as TextDictionary;
    case 'es':
      return (await import('@/lib/i18n/generated/panels.es.json')).default as TextDictionary;
    case 'pt-PT':
      return (await import('@/lib/i18n/generated/panels.pt-PT.json')).default as TextDictionary;
    default:
      return {};
  }
};
