import { loadPanelsDictionary } from '@/lib/i18n/loaders';
import { getRequestLanguage } from '@/lib/i18n/server';
import { PanelsDictionaryClient } from '@/components/i18n/PanelsDictionaryClient';

/**
 * Entrega os textos traduzidos do admin e dos anúncios. Só entra nessas telas; no resto do app
 * esse pacote nem é baixado. Em português do Brasil não há nada a carregar.
 */
export async function PanelsDictionary({ children }: { children: React.ReactNode }) {
  const language = await getRequestLanguage();
  const dictionary = await loadPanelsDictionary(language);
  return (
    <PanelsDictionaryClient language={language} dictionary={dictionary}>
      {children}
    </PanelsDictionaryClient>
  );
}
