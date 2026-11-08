import type { Metadata } from 'next';
import { BusinessInbox } from '@/components/ads/BusinessInbox';
import { requireAdAccountPage } from '@/lib/ads/account';

export const metadata: Metadata = { title: 'Mensagens — Gestor do negócio' };

export default async function AdsInboxPage() {
  await requireAdAccountPage();
  return <BusinessInbox />;
}
