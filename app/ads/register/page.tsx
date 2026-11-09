'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import GringoouLogo from '@/components/icons/GringoouLogo';
import { Button, Card, Input } from '@/components/ui';
import { formatInternationalPhone } from '@/lib/phone';

export default function AdsRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    await signIn('google', { callbackUrl: '/ads/onboarding' });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ads/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await response.json().catch(() => null);
      if (payload?.code === 'ACCOUNT_ALREADY_EXISTS') {
        throw new Error(payload?.error ?? 'Esse e-mail já está cadastrado.');
      }
      if (!response.ok) throw new Error(payload?.error ?? 'Nao foi possivel criar a conta.');
      const result = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      if (result?.error) throw new Error('Conta criada, mas nao foi possivel iniciar a sessao.');
      router.replace('/ads/onboarding');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nao foi possivel criar a conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md items-center">
      <Card className="w-full rounded-[28px] border border-slate-200 p-8 shadow-sm">
        <GringoouLogo size={34} />
        <p className="mt-6 text-xs font-bold uppercase tracking-wider text-brand-500">Portal do anunciante</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#132f40]">Crie sua conta comercial</h1>
        <p className="mt-2 text-sm text-slate-500">Cadastre os dados do responsável para criar e administrar a conta do seu negócio.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-bold">Nome</span><Input required value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} /></label>
            <label className="space-y-2"><span className="text-sm font-bold">Sobrenome</span><Input required value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} /></label>
          </div>
          <label className="block space-y-2"><span className="text-sm font-bold">Email</span><Input type="email" required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
          <label className="block space-y-2"><span className="text-sm font-bold">Telefone / WhatsApp</span><Input type="tel" required inputMode="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: formatInternationalPhone(event.target.value) }))} /></label>
          <label className="block space-y-2"><span className="text-sm font-bold">Senha</span><Input type="password" required minLength={8} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></label>
          {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <Button type="submit" fullWidth loading={loading}>Criar conta</Button>
          <Button type="button" variant="secondary" fullWidth loading={loading} onClick={() => void signInWithGoogle()}>Continuar com Google</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">Já possui uma conta de negócio? <Link href="/ads/login" className="font-bold text-brand-500">Entrar</Link></p>
      </Card>
    </div>
  );
}
