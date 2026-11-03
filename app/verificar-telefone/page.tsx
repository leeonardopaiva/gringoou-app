import type { Metadata } from 'next';
import { VerifyPhoneForm } from '@/components/app/VerifyPhoneForm';

export const metadata: Metadata = {
  title: 'Gringoou - verificar telefone',
  description: 'Confirme seu telefone por SMS.',
};

export default function VerifyPhonePage() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] px-6 py-10">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 rounded-[32px] bg-white px-8 py-10 shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0f2b63]">Confirme seu telefone</h1>
          <p className="text-sm leading-6 text-[#4a5672]">
            Enviaremos um codigo por SMS para confirmar o numero da sua conta.
          </p>
        </div>
        <VerifyPhoneForm />
      </div>
    </main>
  );
}
