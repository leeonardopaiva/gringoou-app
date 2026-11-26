'use client';

import React, { useEffect } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import type { Language } from '@/lib/i18n/dictionaries';
import { loadPanelsDictionary, type TextDictionary } from '@/lib/i18n/loaders';

/**
 * Registra os textos do admin/anúncios no dicionário. Na renderização (inclusive no servidor) o
 * pacote já vem do servidor; se a pessoa trocar de idioma ali, o pacote novo é baixado na hora.
 */
export function PanelsDictionaryClient({ language, dictionary, children }: { language: Language; dictionary: TextDictionary; children: React.ReactNode }) {
  const { language: current, registerDictionary } = useLanguage();

  // Durante a renderização, antes dos filhos: assim a primeira tela já sai traduzida.
  registerDictionary(language, dictionary);

  useEffect(() => {
    if (current === language) return;
    let cancelled = false;
    loadPanelsDictionary(current)
      .then((loaded) => {
        if (!cancelled) registerDictionary(current, loaded, true);
      })
      .catch(() => {
        // Sem o pacote, os painéis continuam em português.
      });
    return () => {
      cancelled = true;
    };
  }, [current, language, registerDictionary]);

  return <>{children}</>;
}
