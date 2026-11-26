'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { dictionaries, type Language, type TranslationKey } from '@/lib/i18n/dictionaries';
import { loadCoreDictionary, type TextDictionary } from '@/lib/i18n/loaders';

const STORAGE_KEY = 'gringoou_language';
const COOKIE_KEY = 'gringoou_language';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Tradução por chave (ex.: t('menu.home')). */
  t: (key: TranslationKey) => string;
  /**
   * Tradução pelo próprio texto em português do Brasil: tx('Salvar') -> 'Save' em inglês.
   * Se o texto ainda não foi traduzido, devolve o original. Os textos traduzidos ficam em
   * lib/i18n/translations/<idioma>.json (separados em núcleo e painéis por `npm run i18n:split`).
   */
  tx: (text: string) => string;
  /**
   * Junta ao dicionário atual textos de um pacote extra (ex.: admin e anúncios). Ignora o pacote se
   * ele for de outro idioma que não o atual. `notify` faz as telas já abertas renderizarem de novo.
   */
  registerDictionary: (language: Language, dictionary: TextDictionary, notify?: boolean) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const readCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((item) => item.startsWith(`${COOKIE_KEY}=`));
  return match ? decodeURIComponent(match.slice(COOKIE_KEY.length + 1)) : null;
};

const writeCookie = (language: Language) => {
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE_KEY}=${language}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  } catch {
    // cookies indisponíveis
  }
};

type LanguageProviderProps = {
  children: React.ReactNode;
  /** Idioma resolvido no servidor (cookie ou Accept-Language). */
  initialLanguage?: Language;
  /** Pacote de textos do idioma inicial, já entregue pelo servidor (evita o "piscar" em português). */
  initialDictionary?: TextDictionary;
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children, initialLanguage = 'pt-BR', initialDictionary }) => {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [version, setVersion] = useState(0);
  // O dicionário fica em refs para `tx` ter identidade estável: manipuladores de clique (avisos,
  // por exemplo) sempre usam o dicionário atual, mesmo sem listá-lo nas dependências.
  const coreRef = useRef<TextDictionary>(initialDictionary ?? {});
  const extraRef = useRef<TextDictionary>({});
  const languageRef = useRef<Language>(initialLanguage);
  const loadedLanguageRef = useRef<Language>(initialLanguage);

  const applyLanguage = useCallback((next: Language, persist: boolean) => {
    languageRef.current = next;
    extraRef.current = {};
    setLanguageState(next);
    if (persist) {
      writeCookie(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // storage indisponível
      }
    }
  }, []);

  // Escolha antiga guardada só no navegador (antes do cookie): migra para o cookie uma única vez.
  useEffect(() => {
    if (readCookie()) return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored && dictionaries[stored] && stored !== languageRef.current) applyLanguage(stored, true);
      else if (stored && dictionaries[stored]) writeCookie(stored);
    } catch {
      // storage indisponível
    }
  }, [applyLanguage]);

  // Troca de idioma depois da primeira tela: carrega o pacote do novo idioma sob demanda.
  useEffect(() => {
    if (loadedLanguageRef.current === language) return;
    let cancelled = false;
    loadCoreDictionary(language)
      .then((dictionary) => {
        if (cancelled) return;
        loadedLanguageRef.current = language;
        coreRef.current = dictionary;
        setVersion((value) => value + 1);
      })
      .catch(() => {
        // Sem o arquivo, o app continua em português: nenhum texto some.
        if (cancelled) return;
        loadedLanguageRef.current = language;
        coreRef.current = {};
        setVersion((value) => value + 1);
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  // Mantém o atributo lang da página no idioma escolhido (leitores de tela, hifenização e tradutores).
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => applyLanguage(next, true), [applyLanguage]);

  const registerDictionary = useCallback((target: Language, dictionary: TextDictionary, notify = false) => {
    if (target !== languageRef.current) return;
    // Mescla sem recriar o objeto, para valer já na renderização atual (inclusive no servidor).
    Object.assign(extraRef.current, dictionary);
    if (notify) setVersion((value) => value + 1);
  }, []);

  const t = useCallback((key: TranslationKey) => dictionaries[language][key] ?? key, [language]);
  const tx = useCallback((text: string) => extraRef.current[text] ?? coreRef.current[text] ?? text, []);

  // `version` entra no valor para os consumidores renderizarem de novo quando as traduções chegam.
  const value = useMemo(
    () => ({ language, setLanguage, t, tx, registerDictionary }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, setLanguage, t, tx, registerDictionary, version],
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
