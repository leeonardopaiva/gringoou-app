'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { BriefcaseBusiness, ChevronDown, ExternalLink, LogOut, Megaphone, Settings, Store, UserRound } from 'lucide-react';
import { Avatar } from '@/components/ui';

type ManagedBusiness = {
  id: string;
  name: string;
  imageUrl: string | null;
  publicPath: string | null;
  managementPath: string;
  adAccountId: string | null;
  adsOnly?: boolean;
};

type CommunityAccountMenuProps = {
  user: { name: string; avatar: string; email?: string | null };
  profileHref: string;
  knownBusinesses?: Array<{
    id: string;
    name: string;
    slug?: string | null;
    imageUrl?: string | null;
    publicPath?: string | null;
  }>;
};

function mapKnownBusinesses(businesses: NonNullable<CommunityAccountMenuProps['knownBusinesses']>): ManagedBusiness[] {
  return businesses.map((business) => {
    const publicPath = business.publicPath || `/negocios/${business.slug || business.id}`;
    return {
      id: business.id,
      name: business.name,
      imageUrl: business.imageUrl || null,
      publicPath,
      managementPath: `${publicPath}/gerenciar`,
      adAccountId: null,
    };
  });
}

export function CommunityAccountMenu({ user, profileHref, knownBusinesses = [] }: CommunityAccountMenuProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [businesses, setBusinesses] = useState<ManagedBusiness[]>(() => mapKnownBusinesses(knownBusinesses));
  const [hasAdAccounts, setHasAdAccounts] = useState(false);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);

  const loadBusinesses = useCallback(async () => {
    setIsLoadingBusinesses(true);
    try {
      const [adsPayload, businessesPayload] = await Promise.all([
      fetch('/api/ads/accounts', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
      fetch('/api/businesses?mine=1', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
      ]);
      const accounts = Array.isArray(adsPayload?.accounts) ? adsPayload.accounts : [];
      const accountsByBusinessId = new Map(accounts.filter((account: { businessId?: string | null }) => account.businessId).map((account: { businessId: string; id: string }) => [account.businessId, account.id]));
      const businessesFromProfile = Array.isArray(businessesPayload?.businesses)
        ? businessesPayload.businesses.map((business: { id: string; slug?: string | null; name: string; imageUrl?: string | null }) => ({
            id: business.id,
            name: business.name,
            imageUrl: business.imageUrl || null,
            publicPath: `/negocios/${business.slug || business.id}`,
            managementPath: `/negocios/${business.slug || business.id}/gerenciar`,
            adAccountId: accountsByBusinessId.get(business.id) || null,
          }))
        : [];
      // Older deployments of the Ads endpoint do not expose `businesses`, but
      // every Ads account already contains its linked business id and public URL.
      // This keeps the community header in sync with the Ads account selector.
      const businessesFromAccounts: ManagedBusiness[] = accounts
        .map((account: { id: string; businessId?: string | null; name: string; logoUrl?: string | null; publicPath?: string | null }) => {
          const publicPath = account.publicPath || (account.businessId ? `/negocios/${account.businessId}` : null);
          return {
            id: account.businessId || `ads:${account.id}`,
            name: account.name,
            imageUrl: account.logoUrl || null,
            publicPath,
            managementPath: publicPath ? `${publicPath}/gerenciar` : '/ads/overview',
            adAccountId: account.id,
            adsOnly: !account.businessId,
          };
        });
      const businessesFromAds = Array.isArray(adsPayload?.businesses) ? adsPayload.businesses : [];
      const mergedBusinesses = [...mapKnownBusinesses(knownBusinesses), ...businessesFromProfile, ...businessesFromAccounts, ...businessesFromAds]
        .filter((business): business is ManagedBusiness => Boolean(business?.id && business?.name))
        .filter((business, index, all) => all.findIndex((candidate) => candidate.id === business.id) === index);
      setBusinesses(mergedBusinesses);
      setHasAdAccounts(accounts.length > 0);
    } catch {
      setBusinesses(mapKnownBusinesses(knownBusinesses));
      setHasAdAccounts(false);
    } finally {
      setIsLoadingBusinesses(false);
    }
  }, [knownBusinesses]);

  useEffect(() => {
    const availableBusinesses = mapKnownBusinesses(knownBusinesses);
    if (!availableBusinesses.length) return;
    setBusinesses((current) => {
      const byId = new Map(current.map((business) => [business.id, business]));
      availableBusinesses.forEach((business) => {
        if (!byId.has(business.id)) byId.set(business.id, business);
      });
      return [...byId.values()];
    });
  }, [knownBusinesses]);

  useEffect(() => {
    void loadBusinesses();
  }, [loadBusinesses]);

  useEffect(() => {
    if (open) void loadBusinesses();
  }, [loadBusinesses, open]);

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

  async function openBusinessManagement(business: ManagedBusiness) {
    if (business.adAccountId) {
      await fetch('/api/ads/accounts/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adAccountId: business.adAccountId }),
      });
    }

    setOpen(false);
    router.push(business.managementPath);
  }

  return (
    <div ref={rootRef} className="relative">
      <button type="button" aria-label="Abrir menu da conta" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex h-14 items-center gap-1 rounded-full p-0 transition hover:bg-slate-100">
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
            {isLoadingBusinesses ? (
              <div className="mt-3 h-12 animate-pulse rounded-xl bg-slate-100" aria-label="Carregando negócios" />
            ) : businesses.length ? <>
              {businesses.map((business) => (
                <div key={business.id} className="mt-2 flex w-full items-center gap-2 rounded-xl p-2 hover:bg-brand-50">
                  <Avatar src={business.imageUrl} name={business.name} size="md" />
                  <button type="button" onClick={() => void openBusinessManagement(business)} className="min-w-0 flex-1 text-left">
                    <strong className="block truncate text-sm text-slate-900">{business.name}</strong>
                    <span className="block truncate text-xs text-slate-500">{business.adsOnly ? 'Gerenciar anúncios' : 'Gerenciar negócio'}</span>
                  </button>
                  {business.publicPath ? <button type="button" onClick={() => { setOpen(false); router.push(business.publicPath!); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-brand-500" aria-label={`Abrir página pública de ${business.name}`} title="Abrir página pública"><ExternalLink size={16} /></button> : null}
                  {business.adsOnly ? <button type="button" onClick={() => { setOpen(false); router.push(`/negocios?create=1&adAccountId=${encodeURIComponent(business.adAccountId || '')}`); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-brand-500" aria-label={`Criar página pública para ${business.name}`} title="Criar página de negócio"><Store size={17} /></button> : null}
                  {business.adAccountId ? <button type="button" onClick={() => void openBusiness(business.adAccountId!)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm" aria-label={`Promover ${business.name}`} title="Promover negócio"><Megaphone size={17} /></button> : null}
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
