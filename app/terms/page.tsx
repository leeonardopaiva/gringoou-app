import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { getTermsDocument } from '@/lib/legal/content';

export const metadata: Metadata = {
  title: 'Gringoou - termos de uso',
  description: 'Termos de Uso do Gringoou.',
};

export default function TermsPage() {
  return <LegalPage document={getTermsDocument()} />;
}
