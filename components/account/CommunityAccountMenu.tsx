'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { BriefcaseBusiness, ChevronDown, ExternalLink, LogOut, Megaphone, Settings, UserRound } from 'lucide-react';
import { Avatar } from '@/components/ui';

type ManagedBusiness = {
  id: string;
  name: string;
  imageUrl: string | null;
  publicPath: string;
  managementPath: string;
  adAccountId: string | null;
};

type CommunityAccountMenuProps = {
  user: { name: string; avatar: string; email?: string | null };
  profileHref: string;
};

export function CommunityAccountMenu({ user, profileHref }: CommunityAccountMenuProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [businesses, setBusinesses] = useState<ManagedBusiness[]>([]);
  const [hasAdAccounts, setHasAdAccounts] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetch('/api/ads/accounts', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
      fetch('/api/businesses?mine=1', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
    ])
      .then(([adsPayload, businessesPayload]) => {
        const accounts = Array.isArray(adsPayload?.accounts) ? adsPayload.accounts : [];
        const accountsByBusinessId = new Map(accounts.filter((account: { businessId?: string | null }) => account.businessId).map((account: { businessId: string; id: string }) => [account.businessId, account.id]));
        const managedBusinesses = Array.isArray(businessesPayload?.businesses)
          ? businessesPayload.businesses.map((business: { id: string; slug?: string | null; name: string; imageUrl?: string | null }) => ({
              id: business.id,
              name: business.name,
              imageUrl: business.imageUrl || null,
              publicPath: `/negocios/${business.slug || business.id}`,
              managementPath: `/negocios/${business.slug || business.id}/gerenciar`,
              adAccountId: accountsByBusinessId.get(business.id) || null,
            }))
          : [];
        setBusinesses(managedBusinesses.length ? managedBusinesses : adsPayload?.businesses ?? []);
        setHasAdAccounts(accounts.length > 0);
      })
      .catch(() => { setBusinesses([]); setHasAdAccounts(false); });
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
          </div>
          <div className="border-t border-slate-100 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Meus negócios</p>
            {businesses.length ? <>
              {businesses.map((business) => (
                <div key={business.id} className="mt-2 flex w-full items-center gap-2 rounded-xl p-2 hover:bg-brand-50">
                  <Avatar src={business.imageUrl} name={business.name} size="md" />
                  <button type="button" onClick={() => { setOpen(false); router.push(business.managementPath); }} className="min-w-0 flex-1 text-left">
                    <strong className="block truncate text-sm text-slate-900">{business.name}</strong>
                    <span className="block truncate text-xs text-slate-500">Gerenciar negócio</span>
                  </button>
                  <button type="button" onClick={() => { setOpen(false); router.push(business.publicPath); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-brand-500" aria-label={`Abrir página pública de ${business.name}`} title="Abrir página pública"><ExternalLink size={16} /></button>
                  {business.adAccountId ? <button type="button" onClick={() => void openBusiness(business.adAccountId!)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm" aria-label={`Abrir campanhas de ${business.name}`} title="Abrir campanhas"><Megaphone size={17} /></button> : null}
                </div>
              ))}
              <button type="button" onClick={() => { setOpen(false); router.push('/negocios?create=1'); }} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-brand-200 p-3 text-left text-sm font-bold text-brand-600 hover:bg-brand-50"><BriefcaseBusiness size={18} />Cadastrar negócio</button>
            </> : (
              <button type="button" onClick={() => { setOpen(false); router.push('/negocios?create=1'); }} className="mt-2 flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-bold text-brand-600 hover:bg-brand-50">
                <BriefcaseBusiness size={18} /> Cadastrar negócio gratuitamente
              </button>
            )}
          </div>
          <div className="border-t border-slate-100 p-2">
            <button type="button" onClick={() => { setOpen(false); router.push(hasAdAccounts ? '/ads/overview' : businesses.length ? '/ads/accounts/new' : '/negocios?create=1'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Megaphone size={17} />{hasAdAccounts ? 'Gerenciar anúncios' : businesses.length ? 'Criar campanha' : 'Como anunciar'}</button>
            <button type="button" onClick={() => void signOut({ callbackUrl: '/login' })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut size={17} />Sair</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
