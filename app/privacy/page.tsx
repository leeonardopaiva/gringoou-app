import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { getPrivacyDocument } from '@/lib/legal/content';
import { getPrivacyDocumentEn } from '@/lib/legal/content-en';

export const metadata: Metadata = {
  title: 'Gringoou - política de privacidade',
  description: 'Política de Privacidade do Gringoou. Privacy Policy.',
};

export default async function PrivacyPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = (await searchParams).lang === 'en' ? 'en' : 'pt';
  return <LegalPage document={locale === 'en' ? getPrivacyDocumentEn() : getPrivacyDocument()} locale={locale} path="/privacy" />;
}
