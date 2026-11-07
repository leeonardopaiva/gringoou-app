import Link from 'next/link';
import { GringoouLogo } from '@/components/icons/GringoouLogo';
import { Card } from '@/components/ui/Card';

type LegalSection = { title: string; paragraphs: string[] };

export default function LegalPage({ title, updatedAt, sections }: { title: string; updatedAt: string; sections: LegalSection[] }) {
  return (
    <main className="min-h-screen bg-bg px-4 py-8 sm:px-6 sm:py-12">
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
              <p className="mt-2 text-body-sm text-muted-foreground">Ultima atualizacao: {updatedAt}</p>
            </header>
            {sections.map((section) => (
              <section key={section.title} className="space-y-3">
                <h2 className="text-h3 font-bold text-foreground">{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-body-sm leading-7 text-muted-foreground">{paragraph}</p>
                ))}
              </section>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
