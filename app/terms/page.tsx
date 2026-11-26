import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { getTermsDocument } from '@/lib/legal/content';
import { getTermsDocumentEn } from '@/lib/legal/content-en';

export const metadata: Metadata = {
  title: 'Gringoou - termos de uso',
  description: 'Termos de Uso do Gringoou. Terms of Use.',
};

export default async function TermsPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = (await searchParams).lang === 'en' ? 'en' : 'pt';
  return <LegalPage document={locale === 'en' ? getTermsDocumentEn() : getTermsDocument()} locale={locale} path="/terms" />;
}
