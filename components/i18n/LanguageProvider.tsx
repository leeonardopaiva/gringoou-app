'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { dictionaries, type Language, type TranslationKey } from '@/lib/i18n/dictionaries';

const STORAGE_KEY = 'gringoou_language';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'pt-BR';
  const stored = window.localStorage.getItem(STORAGE_KEY) as Language | null;
  if (stored && dictionaries[stored]) return stored;
  const nav = window.navigator.language.toLowerCase();
  if (nav.startsWith('en')) return 'en-US';
  if (nav.startsWith('es')) return 'es';
  return 'pt-BR';
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('pt-BR');

  useEffect(() => {
    setLanguageState(getInitialLanguage());
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage indisponível
    }
  };

  const t = (key: TranslationKey) => dictionaries[language][key] ?? key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};