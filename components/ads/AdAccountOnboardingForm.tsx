'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Megaphone, Store } from 'lucide-react';
import GringoouLogo from '@/components/icons/GringoouLogo';
import { Button, Card, Input, Select } from '@/components/ui';
import { useAdAccount } from '@/components/ads/AdAccountProvider';
import { BusinessCategoryField } from '@/components/ads/BusinessCategoryField';
import { formatInternationalPhone } from '@/lib/phone';
import { normalizeUrlFieldValue } from '@/lib/forms/validation';
import { AD_TIMEZONE_OPTIONS, getDefaultAdTimezone } from '@/lib/ads/timezones';
import type { AdvertisableBusiness } from '@/lib/ads/businesses';

type AdAccountOnboardingFormProps = {
  mode?: 'initial' | 'additional';
  currentCount?: number;
  maxAccounts?: number;
  businesses?: AdvertisableBusiness[];
  initialBusinessId?: string;
};

export function AdAccountOnboardingForm({ mode = 'initial', currentCount = 0, maxAccounts = 3, businesses = [], initialBusinessId }: AdAccountOnboardingFormProps) {
  const router = useRouter();
  const { refreshAccounts } = useAdAccount();
  const availableBusinesses = useMemo(
    () => businesses.filter((business) => business.status === 'PUBLISHED' && !business.linkedAdAccountId),
    [businesses],
  );
  const initialBusiness = availableBusinesses.find((business) => business.id === initialBusinessId) ?? availableBusinesses[0];
  const [form, setForm] = useState({ businessId: initialBusiness?.id ?? '', name: initialBusiness?.name ?? '', websiteUrl: initialBusiness?.website ?? '', phone: initialBusiness?.phone ?? '', businessAddress: initialBusiness?.address ?? '', businessCategory: '', country: 'US', currency: 'USD', timezone: getDefaultAdTimezone('US'), isAgency: false, useWebsitePhotos: true, subcategories: [] as string[] });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectBusiness = (businessId: string) => {
    const business = availableBusinesses.find((item) => item.id === businessId);
    setForm((current) => ({
      ...current,
      businessId,
      name: business?.name ?? '',
      websiteUrl: business?.website ?? '',
      phone: business?.phone ?? '',
      businessAddress: business?.address ?? '',
    }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ads/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Nao foi possivel cadastrar a empresa.');
      await refreshAccounts();
      router.replace('/ads/overview');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nao foi possivel cadastrar a empresa.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`mx-auto flex max-w-2xl items-center ${mode === 'initial' ? 'min-h-[calc(100vh-5rem)]' : 'py-6'}`}>
      <Card className="w-full rounded-[28px] border border-slate-200 p-8 shadow-sm">
        {mode === 'initial' ? <GringoouLogo size={34} /> : null}
        <p className={`${mode === 'initial' ? 'mt-6' : ''} text-xs font-bold uppercase tracking-wider text-brand-500`}>{mode === 'initial' ? 'Gringoou Ads' : `Conta ${currentCount + 1} de ${maxAccounts}`}</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#132f40]">Promova seu negócio</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">A página pública é gratuita. Você paga apenas quando cria uma campanha para alcançar mais pessoas no feed da comunidade.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Store, title: '1. Página', text: 'Cadastre seu negócio gratuitamente.' },
            { icon: BadgeCheck, title: '2. Aprovação', text: 'A equipe valida a página pública.' },
            { icon: Megaphone, title: '3. Promoção', text: 'Escolha público, período e investimento.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Icon size={19} className="text-brand-500" />
              <p className="mt-3 text-sm font-bold text-[#132f40]">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
            </div>
          ))}
        </div>

        {availableBusinesses.length === 0 ? (
          <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-bold text-amber-950">Você ainda não possui um negócio aprovado disponível para anunciar.</p>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              {businesses.some((business) => business.status === 'PENDING_REVIEW')
                ? 'Sua página está em análise. Assim que for aprovada, você poderá criar a conta Ads e contratar campanhas.'
                : businesses.some((business) => business.linkedAdAccountId)
                  ? 'Seus negócios aprovados já estão vinculados ao Ads. Acesse o painel para gerenciar as campanhas.'
                  : 'Crie primeiro a página pública gratuita do negócio. Depois da aprovação, volte aqui para promovê-la.'}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link href="/negocios?create=1" className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 text-sm font-bold text-white">Cadastrar negócio gratuitamente</Link>
              {businesses.some((business) => business.linkedAdAccountId) ? <Link href="/ads/overview" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700">Ir para o painel Ads</Link> : null}
            </div>
          </div>
        ) : (
        <form onSubmit={submit} className="mt-7 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2"><span className="text-sm font-bold">Negócio que será promovido</span><Select required value={form.businessId} onChange={(event) => selectBusiness(event.target.value)}><option value="">Selecione um negócio aprovado</option>{availableBusinesses.map((business) => <option key={business.id} value={business.id}>{business.name} — {business.category}</option>)}</Select><span className="block text-xs leading-5 text-slate-500">Os anúncios e pagamentos ficarão vinculados a esta página pública.</span></label>
          <label className="space-y-2 sm:col-span-2"><span className="text-sm font-bold">Nome da empresa</span><Input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
          <label className="space-y-2 sm:col-span-2"><span className="text-sm font-bold">Website</span><Input type="text" inputMode="url" placeholder="empresa.com" value={form.websiteUrl} onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))} onBlur={() => setForm((current) => ({ ...current, websiteUrl: normalizeUrlFieldValue(current.websiteUrl) }))} /></label>
          <label className="space-y-2 sm:col-span-2"><span className="text-sm font-bold">Endereço comercial</span><Input placeholder="Rua, número, cidade, estado e CEP" value={form.businessAddress} onChange={(event) => setForm((current) => ({ ...current, businessAddress: event.target.value }))} /></label>
          <label className="space-y-2 sm:col-span-2"><span className="text-sm font-bold">Telefone / WhatsApp comercial</span><Input type="tel" required inputMode="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: formatInternationalPhone(event.target.value) }))} /></label>
          <div className="sm:col-span-2"><BusinessCategoryField category={form.businessCategory} subcategories={form.subcategories} onCategoryChange={(businessCategory) => setForm((current) => ({ ...current, businessCategory }))} onSubcategoriesChange={(subcategories) => setForm((current) => ({ ...current, subcategories }))} /></div>
          <label className="space-y-2"><span className="text-sm font-bold">Pais</span><Select value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value, timezone: getDefaultAdTimezone(event.target.value) }))}><option value="US">Estados Unidos</option><option value="BR">Brasil</option><option value="PT">Portugal</option><option value="CA">Canada</option></Select></label>
          <label className="space-y-2"><span className="text-sm font-bold">Moeda</span><Select value="USD" disabled><option value="USD">USD - Dolar americano</option></Select></label>
          <label className="space-y-2"><span className="text-sm font-bold">Timezone</span><Select required value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}>{AD_TIMEZONE_OPTIONS.map((timezone) => <option key={timezone.value} value={timezone.value}>{timezone.label}</option>)}</Select></label>
          <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={form.isAgency} onChange={(event) => setForm((current) => ({ ...current, isAgency: event.target.checked }))} /> Esta empresa é uma agência</label>
          {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">{error}</p> : null}
          <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
            {mode === 'additional' ? <Button type="button" variant="secondary" onClick={() => router.back()}>Voltar</Button> : null}
            <Button type="submit" fullWidth={mode === 'initial'} loading={loading}>Continuar para o Ads</Button>
          </div>
        </form>
        )}
      </Card>
    </div>
  );
}
