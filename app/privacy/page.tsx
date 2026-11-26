import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { getPrivacyDocument } from '@/lib/legal/content';

export const metadata: Metadata = {
  title: 'Gringoou - política de privacidade',
  description: 'Política de Privacidade do Gringoou.',
};

export default function PrivacyPage() {
  return <LegalPage document={getPrivacyDocument()} />;
}
