'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { BriefcaseBusiness, ChevronDown, ExternalLink, LogOut, Megaphone, Settings, ShieldCheck, Store } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { Popover } from '@/components/ui/Popover';
import { MessagePrivacyModal } from '@/components/profile/MessagePrivacySection';

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
    const publicPath = business.publicPath || `/businesses/${business.slug || business.id}`;
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

// Stable reference: an inline `= []` default creates a new array on every render,
// which recreates `loadBusinesses` and re-triggers its effects in a loop.
const NO_KNOWN_BUSINESSES: NonNullable<CommunityAccountMenuProps['knownBusinesses']> = [];

export function CommunityAccountMenu({ user, profileHref, knownBusinesses = NO_KNOWN_BUSINESSES }: CommunityAccountMenuProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
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
            publicPath: `/businesses/${business.slug || business.id}`,
            managementPath: `/businesses/${business.slug || business.id}/gerenciar`,
            adAccountId: accountsByBusinessId.get(business.id) || null,
          }))
        : [];
      // Older deployments of the Ads endpoint do not expose `businesses`, but
      // every Ads account already contains its linked business id and public URL.
      // This keeps the community header in sync with the Ads account selector.
      const businessesFromAccounts: ManagedBusiness[] = accounts
        .map((account: { id: string; businessId?: string | null; name: string; logoUrl?: string | null; publicPath?: string | null }) => {
          const publicPath = account.publicPath || (account.businessId ? `/businesses/${account.businessId}` : null);
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
      <button type="button" aria-label="Abrir menu da conta" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex h-10 items-center gap-1 rounded-full p-0 transition hover:bg-slate-100">
        <Avatar src={user.avatar} name={user.name} size="sm" />
        <ChevronDown size={14} className="hidden text-slate-400 sm:block" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={rootRef} align="end" side="bottom" className="w-[310px] overflow-hidden border border-slate-200 bg-white shadow-xl shadow-slate-950/10">
        <div>
          <div className="p-2">
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar src={user.avatar} name={user.name} size="sm" />
              <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{user.name}</strong><span className="block truncate text-xs text-slate-500">{user.email || 'Conta pessoal'}</span></span>
            </div>
            {[
              { label: 'Editar perfil', icon: <Settings size={16} />, href: '/profile?edit=profile' },
              { label: 'Perfil público', icon: <ExternalLink size={16} />, href: profileHref },
              { label: 'Privacidade', icon: <ShieldCheck size={16} />, href: null },
            ].map((item) => (
              <button key={item.label} type="button" onClick={() => { setOpen(false); if (item.href) router.push(item.href); else setPrivacyOpen(true); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"><span className="text-slate-400">{item.icon}</span>{item.label}</button>
            ))}
          </div>
          <div className="border-t border-slate-100 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Meus negócios</p>
            {isLoadingBusinesses ? (
              <div className="mt-3 h-12 animate-pulse rounded-xl bg-slate-100" aria-label="Carregando negócios" />
            ) : businesses.length ? <>
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1">
                {businesses.map((business) => (
                  <div key={business.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-slate-50">
                    <Avatar src={business.imageUrl} name={business.name} size="sm" />
                    <strong className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{business.name}</strong>
                    <button type="button" onClick={() => void openBusinessManagement(business)} className="shrink-0 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white transition hover:brightness-105">Gerenciar</button>
                    {business.publicPath ? <button type="button" onClick={() => { setOpen(false); router.push(business.publicPath!); }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-brand-600" aria-label={`Ver página de ${business.name}`} title="Ver página"><ExternalLink size={15} /></button> : null}
                    {business.adsOnly ? <button type="button" onClick={() => { setOpen(false); router.push(`/businesses?create=1&adAccountId=${encodeURIComponent(business.adAccountId || '')}`); }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-brand-600" aria-label={`Criar página para ${business.name}`} title="Criar página"><Store size={15} /></button> : null}
                    {business.adAccountId ? <button type="button" onClick={() => void openBusiness(business.adAccountId!)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-brand-600" aria-label={`Promover ${business.name}`} title="Promover"><Megaphone size={15} /></button> : null}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => { setOpen(false); router.push('/businesses?create=1'); }} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-brand-200 p-3 text-left text-sm font-bold text-brand-600 hover:bg-brand-50"><BriefcaseBusiness size={18} />Cadastrar negócio</button>
            </> : (
              <button type="button" onClick={() => { setOpen(false); router.push('/businesses?create=1'); }} className="mt-2 flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-bold text-brand-600 hover:bg-brand-50">
                <BriefcaseBusiness size={18} /> Cadastrar negócio gratuitamente
              </button>
            )}
          </div>
          <div className="border-t border-slate-100 p-2">
            <button type="button" onClick={() => { setOpen(false); router.push(hasAdAccounts ? '/ads/overview' : businesses.length ? '/ads/accounts/new' : '/businesses?create=1'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Megaphone size={17} />{hasAdAccounts ? 'Gerenciar anúncios' : businesses.length ? 'Criar campanha' : 'Como anunciar'}</button>
            <button type="button" onClick={() => void signOut({ callbackUrl: '/login' })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut size={17} />Sair</button>
          </div>
        </div>
      </Popover>
      <MessagePrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}
