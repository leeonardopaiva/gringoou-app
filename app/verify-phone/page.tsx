import type { Metadata } from 'next';
import { VerifyPhoneForm } from '@/components/app/VerifyPhoneForm';

export const metadata: Metadata = {
  title: 'Gringoou - verificar telefone',
  description: 'Confirme seu telefone por SMS.',
};

export default function VerifyPhonePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-wash-2 px-5 py-8">
      <div className="w-full max-w-md rounded-[32px] bg-surface px-6 py-9 shadow-sm sm:px-9">
        <VerifyPhoneForm />
      </div>
    </main>
  );
}
