'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { BriefcaseBusiness, ChevronDown, ExternalLink, LogOut, Megaphone, Settings, Store, UserRound } from 'lucide-react';
import { Avatar } from '@/components/ui';

type BusinessAccount = { id: string; name: string; logoUrl: string | null; publicPath?: string | null };

type CommunityAccountMenuProps = {
  user: { name: string; avatar: string; email?: string | null };
  profileHref: string;
  professionalProfileHref?: string | null;
};

export function CommunityAccountMenu({ user, profileHref, professionalProfileHref }: CommunityAccountMenuProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<BusinessAccount[]>([]);
  const [maxAccounts, setMaxAccounts] = useState(3);

  useEffect(() => {
    void fetch('/api/ads/accounts', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        setAccounts(payload?.accounts ?? []);
        setMaxAccounts(payload?.maxAccounts ?? 3);
      })
      .catch(() => setAccounts([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  async function openBusiness(accountId: string) {
    await fetch('/api/ads/accounts/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adAccountId: accountId }),
    });
    setOpen(false);
    router.push('/ads/overview');
  }

  return (
    <div ref={rootRef} className="relative">
      <button type="button" aria-label="Abrir menu da conta" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex items-center gap-1 rounded-full p-0.5 transition hover:bg-slate-100">
        <Avatar src={user.avatar} name={user.name} size="md" />
        <ChevronDown size={14} className="hidden text-slate-400 sm:block" />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[80] w-[310px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/10">
          <div className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Conectado como</p>
            <div className="mt-3 flex w-full items-center gap-3 rounded-xl bg-slate-50 p-2">
              <Avatar src={user.avatar} name={user.name} size="md" />
              <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{user.name}</strong><span className="block truncate text-xs text-slate-500">{user.email || 'Conta pessoal'}</span></span>
              <UserRound size={18} className="text-slate-400" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setOpen(false); router.push('/profile'); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><Settings size={14} className="mr-1 inline" />Editar perfil</button>
              <button type="button" onClick={() => { setOpen(false); router.push(profileHref); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-brand-600 hover:bg-brand-50"><ExternalLink size={14} className="mr-1 inline" />Perfil público</button>
            </div>
            {professionalProfileHref ? <button type="button" onClick={() => { setOpen(false); router.push(professionalProfileHref); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-600"><Store size={14} />Ver vitrine profissional</button> : null}
          </div>
          <div className="border-t border-slate-100 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Negócios</p>
            {accounts.length ? <>
              {accounts.map((account) => (
                <div key={account.id} className="mt-2 flex w-full items-center gap-2 rounded-xl p-2 hover:bg-brand-50">
                  <Avatar src={account.logoUrl} name={account.name} size="md" />
                  <button type="button" onClick={() => { setOpen(false); router.push(account.publicPath ? `${account.publicPath}/gerenciar` : '/negocios'); }} className="min-w-0 flex-1 text-left">
                    <strong className="block truncate text-sm text-slate-900">{account.name}</strong>
                    <span className="block truncate text-xs text-slate-500">Gerenciar página</span>
                  </button>
                  <button type="button" onClick={() => void openBusiness(account.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm" aria-label={`Abrir anúncios de ${account.name}`} title="Abrir anúncios">
                    <Megaphone size={17} />
                  </button>
                </div>
              ))}
              {accounts.length < maxAccounts ? <button type="button" onClick={() => { setOpen(false); router.push('/ads/accounts/new'); }} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-brand-200 p-3 text-left text-sm font-bold text-brand-600 hover:bg-brand-50"><BriefcaseBusiness size={18} />Adicionar outro negócio</button> : null}
            </> : (
              <button type="button" onClick={() => { setOpen(false); router.push('/negocios?create=1'); }} className="mt-2 flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-bold text-brand-600 hover:bg-brand-50">
                <BriefcaseBusiness size={18} /> Cadastrar negócio gratuitamente
              </button>
            )}
          </div>
          <div className="border-t border-slate-100 p-2">
            <button type="button" onClick={() => { setOpen(false); router.push(accounts.length ? '/ads/overview' : '/negocios?create=1'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Megaphone size={17} />{accounts.length ? 'Gerenciar anúncios' : 'Como anunciar'}</button>
            <button type="button" onClick={() => void signOut({ callbackUrl: '/login' })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut size={17} />Sair</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
