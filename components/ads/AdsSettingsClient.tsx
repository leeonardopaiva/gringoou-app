'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, Edit3, Globe2, Mail, MapPin, Plus, ShieldCheck } from 'lucide-react';
import CloudinaryImageField from '@/components/forms/CloudinaryImageField';
import { useToast } from '@/components/feedback/ToastProvider';
import { Avatar, Badge, Button, Card, Input, Modal, Select, Toggle } from '@/components/ui';
import { BusinessCategoryField } from '@/components/ads/BusinessCategoryField';
import { useAdAccount } from '@/components/ads/AdAccountProvider';
import { formatInternationalPhone } from '@/lib/phone';
import { normalizeUrlFieldValue } from '@/lib/forms/validation';
import { AD_TIMEZONE_OPTIONS, getDefaultAdTimezone } from '@/lib/ads/timezones';
import { PublicLinksBlock } from '@/components/profile/PublicLinksBlock';

type AccountData = {
  id: string; name: string; websiteUrl: string | null; phone: string | null; businessAddress: string | null;
  businessCategory: string | null; subcategories: string[]; country: string; currency: string; timezone: string;
  logoUrl: string | null; useWebsitePhotos: boolean;
  business: { id: string; slug: string; name: string } | null;
  users: Array<{ id: string; role: 'BUSINESS_ADMIN' | 'ADMIN' | 'EDITOR' | 'VIEWER'; user: { id: string; name: string | null; email: string | null; image: string | null } }>;
};
type UserData = { name: string | null; email: string | null; marketingEmailsOptOut: boolean; preferredLanguage: string };

export function AdsSettingsClient({ initialAccount, initialUser }: { initialAccount: AccountData; initialUser: UserData }) {
  const { showToast } = useToast();
  const { accounts, canCreateAccount, maxAccounts, refreshAccounts } = useAdAccount();
  const [account, setAccount] = useState(initialAccount);
  const [editOpen, setEditOpen] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [accountForm, setAccountForm] = useState({ ...initialAccount, phone: formatInternationalPhone(initialAccount.phone ?? '') });
  const names = useMemo(() => { const parts = (initialUser.name ?? '').trim().split(/\s+/); return { firstName: parts.shift() ?? '', lastName: parts.join(' ') }; }, [initialUser.name]);
  const [userForm, setUserForm] = useState({ ...names, email: initialUser.email ?? '', marketingEmailsOptOut: initialUser.marketingEmailsOptOut, preferredLanguage: initialUser.preferredLanguage });

  useEffect(() => {
    setAccount(initialAccount);
    setAccountForm({ ...initialAccount, phone: formatInternationalPhone(initialAccount.phone ?? '') });
    setEditOpen(false);
  }, [initialAccount]);

  const saveAccount = async () => {
    setSavingAccount(true);
    try {
      const response = await fetch(`/api/ads/accounts/${account.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(accountForm) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Nao foi possivel atualizar a empresa.');
      setAccount((current) => ({ ...current, ...payload.account }));
      await refreshAccounts();
      setEditOpen(false);
      showToast('Conta comercial atualizada.', 'success');
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Falha ao atualizar a empresa.', 'error'); }
    finally { setSavingAccount(false); }
  };

  const saveUser = async () => {
    setSavingUser(true);
    try {
      const response = await fetch('/api/ads/settings/user', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Nao foi possivel salvar seus dados.');
      showToast('Dados pessoais atualizados.', 'success');
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Falha ao salvar seus dados.', 'error'); }
    finally { setSavingUser(false); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-brand-500">Conta</p><h1 className="mt-1 text-3xl font-extrabold text-[#132f40]">Configuracoes</h1><p className="mt-1 text-sm text-slate-500">{accounts.length} de {maxAccounts} contas de negócio vinculadas.</p></div>{canCreateAccount ? <Link href="/ads/accounts/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-500 px-5 text-sm font-bold text-white hover:brightness-105"><Plus size={17} />Nova conta de negócio</Link> : null}</div>
      <Card className="rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar src={account.logoUrl} name={account.name} size="xl" />
          <div className="min-w-0 flex-1"><h2 className="text-xl font-extrabold text-[#132f40]">{account.name}</h2><p className="mt-1 text-xs text-slate-400">Account ID: {account.id}</p><div className="mt-4 flex flex-wrap gap-2">{account.subcategories.map((item) => <Badge key={item} tone="primary" variant="outline" className="normal-case">{item}</Badge>)}</div></div>
          <Button variant="secondary" iconLeft={<Edit3 size={16} />} onClick={() => setEditOpen(true)}>Editar</Button>
        </div>
        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {[['Categoria', account.businessCategory ?? '-'], ['Pais / Moeda', `${account.country} / ${account.currency}`], ['Fuso horario', account.timezone], ['Website', account.websiteUrl ?? '-']].map(([label, value]) => <div key={label}><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-semibold text-[#243b53]">{value}</p></div>)}
        </div>
      </Card>

      {account.business ? (
        <PublicLinksBlock
          links={[{ id: account.business.id, label: `Página pública de ${account.business.name}`, path: `/negocios/${account.business.slug}` }]}
        />
      ) : null}

      <Card className="rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3"><ShieldCheck className="text-brand-500" /><Card.Title>Dados pessoais</Card.Title></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-bold">First Name</span><Input value={userForm.firstName} onChange={(event) => setUserForm((current) => ({ ...current, firstName: event.target.value }))} /></label><label className="space-y-2"><span className="text-sm font-bold">Last Name</span><Input value={userForm.lastName} onChange={(event) => setUserForm((current) => ({ ...current, lastName: event.target.value }))} /></label><label className="space-y-2 sm:col-span-2"><span className="text-sm font-bold">Email address</span><Input type="email" value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} prefixIcon={<Mail size={16} />} /></label><label className="space-y-2"><span className="text-sm font-bold">Idioma</span><Select value={userForm.preferredLanguage} onChange={(event) => setUserForm((current) => ({ ...current, preferredLanguage: event.target.value }))}><option value="pt-BR">Portugues</option><option value="en-US">English</option><option value="es">Espanol</option></Select></label><div className="flex items-end"><Toggle checked={userForm.marketingEmailsOptOut} onChange={(value) => setUserForm((current) => ({ ...current, marketingEmailsOptOut: value }))} label="Opt out of marketing emails?" /></div></div>
        <div className="mt-5 flex justify-end"><Button onClick={() => void saveUser()} loading={savingUser}>Salvar dados pessoais</Button></div>
      </Card>

      <Card className="rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3"><Building2 className="text-brand-500" /><Card.Title>Membros e permissoes</Card.Title></div>
        <div className="mt-5 divide-y divide-slate-100">{account.users.map((membership) => <div key={membership.id} className="flex items-center gap-3 py-4"><Avatar src={membership.user.image} name={membership.user.name ?? membership.user.email ?? 'Usuario'} size="md" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#243b53]">{membership.user.name ?? 'Usuario'}</p><p className="truncate text-xs text-slate-400">{membership.user.email}</p></div><Badge tone={membership.role.includes('ADMIN') ? 'primary' : 'neutro'} className="normal-case">{membership.role}</Badge></div>)}</div>
      </Card>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar conta comercial" description="Atualize as informações da conta do seu negócio." className="max-w-2xl" footer={<><Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button><Button loading={savingAccount} onClick={() => void saveAccount()}>Salvar alteracoes</Button></>}>
        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          <div><span className="mb-2 block text-sm font-bold">Logo da empresa</span><CloudinaryImageField value={accountForm.logoUrl ?? ''} onChange={(logoUrl) => setAccountForm((current) => ({ ...current, logoUrl }))} folder="businesses" width={120} height={120} /></div>
          <label className="block space-y-2"><span className="text-sm font-bold">Nome da empresa</span><Input value={accountForm.name} onChange={(event) => setAccountForm((current) => ({ ...current, name: event.target.value }))} /></label>
          <label className="block space-y-2"><span className="text-sm font-bold">Website URL</span><Input type="text" inputMode="url" placeholder="empresa.com" value={accountForm.websiteUrl ?? ''} onChange={(event) => setAccountForm((current) => ({ ...current, websiteUrl: event.target.value }))} onBlur={() => setAccountForm((current) => ({ ...current, websiteUrl: normalizeUrlFieldValue(current.websiteUrl ?? '') }))} prefixIcon={<Globe2 size={16} />} /></label>
          <label className="block space-y-2"><span className="text-sm font-bold">Telefone comercial</span><Input type="tel" value={accountForm.phone ?? ''} onChange={(event) => setAccountForm((current) => ({ ...current, phone: formatInternationalPhone(event.target.value) }))} /></label>
          <label className="block space-y-2"><span className="text-sm font-bold">Endereco comercial completo</span><Input value={accountForm.businessAddress ?? ''} onChange={(event) => setAccountForm((current) => ({ ...current, businessAddress: event.target.value }))} prefixIcon={<MapPin size={16} />} /></label>
          <BusinessCategoryField category={accountForm.businessCategory ?? ''} subcategories={accountForm.subcategories} onCategoryChange={(businessCategory) => setAccountForm((current) => ({ ...current, businessCategory }))} onSubcategoriesChange={(subcategories) => setAccountForm((current) => ({ ...current, subcategories }))} />
          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-bold">País</span><Select value={accountForm.country} onChange={(event) => setAccountForm((current) => ({ ...current, country: event.target.value, timezone: getDefaultAdTimezone(event.target.value) }))}><option value="US">Estados Unidos</option><option value="BR">Brasil</option><option value="PT">Portugal</option><option value="CA">Canadá</option></Select></label><label className="space-y-2"><span className="text-sm font-bold">Timezone</span><Select value={accountForm.timezone} onChange={(event) => setAccountForm((current) => ({ ...current, timezone: event.target.value }))}>{AD_TIMEZONE_OPTIONS.map((timezone) => <option key={timezone.value} value={timezone.value}>{timezone.label}</option>)}</Select></label></div>
          <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-[#243b53]"><input type="checkbox" className="mt-1" checked={accountForm.useWebsitePhotos} onChange={(event) => setAccountForm((current) => ({ ...current, useWebsitePhotos: event.target.checked }))} />Use photos from my website in my ads (recommended)</label>
        </div>
      </Modal>
    </div>
  );
}
