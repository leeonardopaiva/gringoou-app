import Link from 'next/link';
import { GringoouLogo } from '@/components/icons/GringoouLogo';
import { Card } from '@/components/ui/Card';
import type { LegalDocument } from '@/lib/legal/content';

export type LegalLocale = 'pt' | 'en';

const COPY: Record<LegalLocale, { back: string; updated: string; regions: string; regionsIntro: string; regionsNav: string; language: string }> = {
  pt: {
    back: 'Voltar para entrar',
    updated: 'Última atualização',
    regions: 'Informações por região',
    regionsIntro: 'Estas informações complementam o texto acima para quem está em cada região.',
    regionsNav: 'Regiões',
    language: 'Idioma',
  },
  en: {
    back: 'Back to sign in',
    updated: 'Last updated',
    regions: 'Information by region',
    regionsIntro: 'This information complements the text above for people in each region.',
    regionsNav: 'Regions',
    language: 'Language',
  },
};

/**
 * Página legal pública (Termos de Uso e Política de Privacidade), em português e inglês. Os adendos
 * por região ficam num bloco próprio, com índice, para cada pessoa achar a parte do país dela.
 */
export default function LegalPage({ document, locale, path }: { document: LegalDocument; locale: LegalLocale; path: string }) {
  const { title, updatedAt, sections, regional } = document;
  const copy = COPY[locale];

  return (
    <main className="min-h-dvh bg-bg px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/login" className="inline-flex items-center gap-3 text-foreground">
            <GringoouLogo size={34} />
            <span className="text-sm font-bold">{copy.back}</span>
          </Link>
          <nav aria-label={copy.language} className="flex shrink-0 gap-1 rounded-full border border-border bg-surface p-1 text-caption font-bold">
            {(['pt', 'en'] as const).map((code) => (
              <Link
                key={code}
                href={code === 'pt' ? path : `${path}?lang=en`}
                hrefLang={code}
                aria-current={locale === code ? 'true' : undefined}
                className={`rounded-full px-3 py-1.5 transition ${locale === code ? 'bg-brand-100 text-brand-700' : 'text-muted-foreground hover:bg-wash-1'}`}
              >
                {code === 'pt' ? 'Português' : 'English'}
              </Link>
            ))}
          </nav>
        </div>

        <Card className="border border-border bg-surface shadow-sm">
          <div className="space-y-8 p-1 sm:p-5">
            <header className="border-b border-border pb-6">
              <p className="text-caption font-bold uppercase tracking-wide text-brand-500">Gringoou</p>
              <h1 className="mt-2 text-h1 font-extrabold text-foreground">{title}</h1>
              <p className="mt-2 text-body-sm text-muted-foreground">{copy.updated}: {updatedAt}</p>
            </header>

            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-6 space-y-3">
                <h2 className="text-h3 font-bold text-foreground">{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-body-sm leading-7 text-muted-foreground">{paragraph}</p>
                ))}
              </section>
            ))}

            {regional.length > 0 ? (
              <section id="regions" className="scroll-mt-6 space-y-5 border-t border-border pt-8">
                <div className="space-y-3">
                  <h2 className="text-h2 font-extrabold text-foreground">{copy.regions}</h2>
                  <p className="text-body-sm leading-7 text-muted-foreground">{copy.regionsIntro}</p>
                  <nav aria-label={copy.regionsNav} className="flex flex-wrap gap-2">
                    {regional.map((item) => (
                      <a
                        key={item.id}
                        href={`#region-${item.id}`}
                        className="rounded-full border border-border px-3 py-1.5 text-caption font-semibold text-foreground transition hover:bg-brand-100"
                      >
                        {item.title.split(' (')[0]}
                      </a>
                    ))}
                  </nav>
                </div>

                {regional.map((item) => (
                  <section key={item.id} id={`region-${item.id}`} className="scroll-mt-6 space-y-3 rounded-2xl bg-wash-1 p-5">
                    <h3 className="text-h3 font-bold text-foreground">{item.title}</h3>
                    {item.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="text-body-sm leading-7 text-muted-foreground">{paragraph}</p>
                    ))}
                  </section>
                ))}
              </section>
            ) : null}
          </div>
        </Card>
      </div>
    </main>
  );
}
