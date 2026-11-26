'use client';

import Link from 'next/link';
import { LanguageMenu } from '@/components/i18n/LanguageMenu';
import { useLanguage } from '@/components/i18n/LanguageProvider';

/**
 * Rodapé da landing: direitos, links legais e seletor de idioma.
 * Os links legais ficam sempre visíveis (também no celular), porque a política de privacidade
 * precisa estar acessível antes de qualquer cadastro.
 */
export function LandingFooter() {
  const { tx } = useLanguage();
  const year = new Date().getFullYear();

  const legalLinks = (
    <>
      <Link href="/privacy" className="transition-colors hover:text-[#0f2b63]">{tx('Privacidade')}</Link>
      <Link href="/terms" className="transition-colors hover:text-[#0f2b63]">{tx('Termos')}</Link>
    </>
  );

  return (
    <footer className="mx-auto mt-auto flex w-full max-w-[1440px] items-center justify-between gap-x-6 px-5 pb-6 pt-4 text-sm text-[#6b7a9e] sm:px-8 lg:px-16">
      <div className="flex flex-col gap-1.5">
        <p>© {year} Gringoou</p>
        <nav aria-label={tx('Links legais')} className="flex items-center gap-4 text-[13px] sm:hidden">
          {legalLinks}
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <nav aria-label={tx('Links legais')} className="hidden items-center gap-6 sm:flex">
          {legalLinks}
        </nav>
        <LanguageMenu variant="footer" placement="up" />
      </div>
    </footer>
  );
}
