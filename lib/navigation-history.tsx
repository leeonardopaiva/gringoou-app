'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Rastreia se a pessoa já navegou dentro do app nesta aba.
 *
 * `document.referrer` só é preenchido em carregamento completo da página; em navegação
 * interna (Next.js) ele fica desatualizado. Por isso o botão Voltar usava o destino padrão
 * mesmo quando a pessoa tinha vindo de outra tela do app.
 */
let internalNavigations = 0;
let lastPathname: string | null = null;

export function NavigationTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (lastPathname !== null && lastPathname !== pathname) internalNavigations += 1;
    lastPathname = pathname;
  }, [pathname]);

  return null;
}

/** Há uma tela anterior do próprio app para onde voltar? */
export function canGoBackInApp(): boolean {
  if (internalNavigations > 0) return true;
  try {
    // Carregamento completo vindo de um link interno (ex.: abriu em nova aba por dentro do app).
    return (
      Boolean(document.referrer) &&
      new URL(document.referrer).origin === window.location.origin &&
      window.history.length > 1
    );
  } catch {
    return false;
  }
}

type RouterLike = { back: () => void; push: (href: string) => void };

/** Volta para a tela de onde a pessoa veio; em acesso direto por link, vai para `fallbackHref`. */
export function goBackOr(router: RouterLike, fallbackHref: string) {
  if (canGoBackInApp()) router.back();
  else router.push(fallbackHref);
}
