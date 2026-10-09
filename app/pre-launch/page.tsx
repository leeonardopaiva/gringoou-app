import type { Metadata } from 'next';
import { PreLaunchGateForm } from './PreLaunchGateForm';

export const metadata: Metadata = {
  title: 'Gringoou - acesso restrito',
  description: 'Acesso restrito durante o pre-lancamento.',
};

export default function PreLaunchPage() {
  return <PreLaunchGateForm />;
}
