'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { dictionaries, type Language, type TranslationKey } from '@/lib/i18n/dictionaries';

const STORAGE_KEY = 'gringoou_language';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Tradução por chave (ex.: t('menu.home')). */
  t: (key: TranslationKey) => string;
  /**
   * Tradução pelo próprio texto em português do Brasil: tx('Salvar') -> 'Save' em inglês.
   * Se o texto ainda não foi traduzido, devolve o original. Os textos traduzidos ficam em
   * lib/i18n/translations/<idioma>.json (carregados só para o idioma escolhido).
   */
  tx: (text: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

type TextDictionary = Record<string, string>;

/** Carrega o dicionário de textos do idioma, sob demanda. O português do Brasil não precisa de arquivo. */
const loadTextDictionary = async (language: Language): Promise<TextDictionary> => {
  switch (language) {
    case 'en-US':
      return (await import('@/lib/i18n/translations/en-US.json')).default as TextDictionary;
    case 'es':
      return (await import('@/lib/i18n/translations/es.json')).default as TextDictionary;
    case 'pt-PT':
      return (await import('@/lib/i18n/translations/pt-PT.json')).default as TextDictionary;
    default:
      return {};
  }
};

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'pt-BR';
  const stored = window.localStorage.getItem(STORAGE_KEY) as Language | null;
  if (stored && dictionaries[stored]) return stored;
  const nav = window.navigator.language.toLowerCase();
  if (nav.startsWith('pt-pt')) return 'pt-PT';
  if (nav.startsWith('en')) return 'en-US';
  if (nav.startsWith('es')) return 'es';
  return 'pt-BR';
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('pt-BR');
  const [textDictionary, setTextDictionary] = useState<TextDictionary>({});
  // O dicionário fica numa ref para `tx` ter identidade estável: manipuladores de clique (avisos,
  // por exemplo) sempre usam o dicionário atual, mesmo sem listá-lo nas dependências.
  const dictionaryRef = useRef<TextDictionary>({});

  useEffect(() => {
    setLanguageState(getInitialLanguage());
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadTextDictionary(language)
      .then((dictionary) => {
        if (cancelled) return;
        dictionaryRef.current = dictionary;
        setTextDictionary(dictionary);
      })
      .catch(() => {
        // Sem o arquivo, o app continua em português: nenhum texto some.
        if (cancelled) return;
        dictionaryRef.current = {};
        setTextDictionary({});
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  // Mantém o atributo lang da página no idioma escolhido (leitores de tela, hifenização e tradutores).
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage indisponível
    }
  }, []);

  const t = useCallback((key: TranslationKey) => dictionaries[language][key] ?? key, [language]);
  const tx = useCallback((text: string) => dictionaryRef.current[text] ?? text, []);

  // `textDictionary` entra no valor para os consumidores renderizarem de novo quando as traduções chegam.
  const value = useMemo(
    () => ({ language, setLanguage, t, tx }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, setLanguage, t, tx, textDictionary],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
