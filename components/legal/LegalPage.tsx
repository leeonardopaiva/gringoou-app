import Link from 'next/link';
import { GringoouLogo } from '@/components/icons/GringoouLogo';
import { Card } from '@/components/ui/Card';
import type { LegalDocument } from '@/lib/legal/content';

/**
 * Página legal pública (Termos de Uso e Política de Privacidade). Os adendos por região ficam num
 * bloco próprio, com índice, para cada pessoa achar rápido a parte que vale para o país dela.
 */
export default function LegalPage({ document }: { document: LegalDocument }) {
  const { title, updatedAt, sections, regional } = document;

  return (
    <main className="min-h-dvh bg-bg px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/login" className="mb-8 inline-flex items-center gap-3 text-foreground">
          <GringoouLogo size={34} />
          <span className="text-sm font-bold">Voltar para entrar</span>
        </Link>
        <Card className="border border-border bg-surface shadow-sm">
          <div className="space-y-8 p-1 sm:p-5">
            <header className="border-b border-border pb-6">
              <p className="text-caption font-bold uppercase tracking-wide text-brand-500">Gringoou</p>
              <h1 className="mt-2 text-h1 font-extrabold text-foreground">{title}</h1>
              <p className="mt-2 text-body-sm text-muted-foreground">Última atualização: {updatedAt}</p>
            </header>

            {sections.map((section) => (
              <section key={section.id} id={section.id} className="space-y-3 scroll-mt-6">
                <h2 className="text-h3 font-bold text-foreground">{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-body-sm leading-7 text-muted-foreground">{paragraph}</p>
                ))}
              </section>
            ))}

            {regional.length > 0 ? (
              <section id="regions" className="space-y-5 border-t border-border pt-8 scroll-mt-6">
                <div className="space-y-3">
                  <h2 className="text-h2 font-extrabold text-foreground">Informações por região</h2>
                  <p className="text-body-sm leading-7 text-muted-foreground">
                    Estas informações complementam o texto acima para quem está em cada região.
                  </p>
                  <nav aria-label="Regiões" className="flex flex-wrap gap-2">
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
                  <section key={item.id} id={`region-${item.id}`} className="space-y-3 rounded-2xl bg-wash-1 p-5 scroll-mt-6">
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
