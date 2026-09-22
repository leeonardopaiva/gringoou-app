'use client';

import { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISSED_AT_KEY = 'gringoou:a2hs-dismissed-at';
const ACCESS_COUNT_KEY = 'gringoou:a2hs-access-count';
const SESSION_RECORDED_KEY = 'gringoou:a2hs-session-recorded';
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 6000;

export default function AddToHomeScreenPrompt() {
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const dismissedAt = Number(window.localStorage.getItem(DISMISSED_AT_KEY) || 0);
    const wasRecentlyDismissed = dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_DURATION_MS;
    if (isStandalone || !isMobile || wasRecentlyDismissed) return;

    let accessCount = Number(window.localStorage.getItem(ACCESS_COUNT_KEY) || 0);
    if (!window.sessionStorage.getItem(SESSION_RECORDED_KEY)) {
      accessCount += 1;
      window.localStorage.setItem(ACCESS_COUNT_KEY, String(accessCount));
      window.sessionStorage.setItem(SESSION_RECORDED_KEY, '1');
    }
    if (accessCount < 2) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIos(ios);

    const showTimer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setVisible(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setVisible(false);
    setInstallPrompt(null);
  };

  if (!visible) return null;

  return (
    <aside className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[80] mx-auto max-w-sm rounded-2xl border border-brand-100 bg-white p-4 shadow-[0_18px_55px_rgba(15,23,42,0.18)] md:hidden" aria-label="Adicionar Gringoou à tela inicial">
      <button type="button" onClick={dismiss} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar instrução"><X size={17} /></button>
      <div className="flex gap-3 pr-7">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Smartphone size={22} /></span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">Tenha o Gringoou sempre por perto</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {installPrompt
              ? 'Adicione o app à tela inicial para acessar a comunidade mais rápido.'
              : isIos
                ? 'No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.'
                : 'Abra o menu do navegador e escolha Adicionar à tela inicial.'}
          </p>
          {installPrompt ? (
            <button type="button" onClick={() => void install()} className="mt-3 inline-flex h-9 items-center gap-2 rounded-full bg-brand-500 px-4 text-xs font-bold text-white transition hover:brightness-105"><Download size={15} /> Adicionar agora</button>
          ) : isIos ? (
            <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-brand-600"><Share size={14} /> Compartilhar</span>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
