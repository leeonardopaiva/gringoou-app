'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import GringoouLogo from '@/components/icons/GringoouLogo';
import { Button, Card, Input } from '@/components/ui';

export default function AdsLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const result = await signIn('google', { callbackUrl: '/ads/overview', redirect: false });
    if (result?.error) {
      setError('Nao foi possivel entrar com Google.');
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn('credentials', { email, password, redirect: false });
    if (result?.error) {
      setError('Email ou senha invalidos.');
      setLoading(false);
      return;
    }
    const accountsResponse = await fetch('/api/ads/accounts', { cache: 'no-store' });
    const payload = await accountsResponse.json().catch(() => null);
    router.replace(payload?.accounts?.length ? '/ads/overview' : '/ads/onboarding');
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
      <Card className="w-full rounded-[28px] border border-slate-200 p-8 shadow-sm">
        <GringoouLogo size={34} />
        <p className="mt-6 text-xs font-bold uppercase tracking-wider text-brand-500">Portal do anunciante</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#132f40]">Acesse sua conta de negócio</h1>
        <p className="mt-2 text-sm text-slate-500">Entre para gerenciar sua empresa e criar anúncios no Gringoou.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block space-y-2"><span className="text-sm font-bold">Email</span><Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="block space-y-2"><span className="text-sm font-bold">Senha</span><Input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <Button type="submit" fullWidth loading={loading}>Entrar</Button>
          <Button type="button" variant="secondary" fullWidth loading={loading} onClick={() => void signInWithGoogle()}>Entrar com Google</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">Ainda não tem uma página de negócio? <Link href="/negocios?create=1" className="font-bold text-brand-500">Cadastrar gratuitamente</Link></p>
      </Card>
    </div>
  );
}
