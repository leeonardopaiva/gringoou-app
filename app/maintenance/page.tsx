import type { Metadata } from 'next';
import { Logo } from '@/components/Layout';

export const metadata: Metadata = {
  title: 'Gringoou em manutencao',
  description: 'A plataforma esta temporariamente em manutencao.',
};

export default function MaintenancePage() {
  return (
    <main className="min-h-dvh bg-bg px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-2xl items-center justify-center">
        <div className="w-full max-w-lg rounded-[32px] bg-white px-8 py-10 text-center shadow-sm sm:px-10 sm:py-12">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>

          <p className="mt-8 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Em manutencao
          </p>
        </div>
      </div>
    </main>
  );
}
