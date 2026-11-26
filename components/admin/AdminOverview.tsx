'use client';

import { CalendarDays, CheckCircle2, Clock3, MessageCircle, Megaphone, RefreshCcw, Store, Users } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { InfoTip } from '@/components/ui/InfoTip';
import { useLanguage } from '@/components/i18n/LanguageProvider';

type Section = 'ads' | 'moderation' | 'businesses' | 'events' | 'users' | 'regions' | 'imports' | 'banners' | 'analytics';
type Actor = { name: string | null; email: string | null };
type Dashboard = {
  stats: { totalUsers: number; publishedBusinesses: number; publishedEvents: number; publishedPosts: number; pendingBusinesses: number; pendingEvents: number; pendingPosts: number; newSuggestions: number; activeRegions: number; totalReferrals: number; convertedReferrals: number };
  referrals: { total: number; converted: number; conversionRate: number; topReferrer: { name: string | null; username: string | null; locationLabel: string | null; interests: string[]; count: number } | null };
  pendingBusinesses: Array<{ id: string; name: string; createdAt: string; createdBy: Actor }>;
  pendingEvents: Array<{ id: string; title: string; createdAt: string; createdBy: Actor }>;
  pendingPosts: Array<{ id: string; content: string; createdAt: string; author: Actor }>;
  suggestions: Array<{ id: string; message: string; createdAt: string; user: { name: string | null; username: string | null } }>;
  banners: Array<{ id: string; name: string; paymentStatus: string; campaignStatus: string }>;
  regions: Array<{ key: string; label: string; isActive: boolean }>;
};

const compactNumber = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const relativeDate = (value: string) => {
  const hours = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000));
  return hours < 24 ? `ha ${hours}h` : `ha ${Math.floor(hours / 24)}d`;
};

export default function AdminOverview({ dashboard, loading, refreshing, onRefresh, onNavigate }: { dashboard: Dashboard | null; loading: boolean; refreshing: boolean; onRefresh: () => void; onNavigate: (section: Section) => void }) {
  const { tx } = useLanguage();
  const pendingAds = dashboard?.banners.filter((banner) => banner.paymentStatus === 'PAID' && banner.campaignStatus !== 'ACTIVE') ?? [];
  const totalPending = (dashboard?.stats.pendingBusinesses ?? 0) + (dashboard?.stats.pendingEvents ?? 0) + (dashboard?.stats.pendingPosts ?? 0) + pendingAds.length;
  const kpis = [
    { label: tx('Pendências'), value: totalPending, caption: tx('Requer atenção'), icon: Clock3, color: 'bg-amber-100 text-amber-600', section: 'moderation' as const },
    { label: tx('Anúncios'), value: pendingAds.length, caption: tx('Aguardando revisão'), icon: Megaphone, color: 'bg-blue-50 text-[#2B5DF5]', section: 'ads' as const },
    { label: tx('Usuários'), value: dashboard?.stats.totalUsers ?? 0, caption: tx('Cadastrados'), icon: Users, color: 'bg-emerald-50 text-emerald-600', section: 'users' as const },
    { label: tx('Negócios'), value: dashboard?.stats.publishedBusinesses ?? 0, caption: `${dashboard?.stats.pendingBusinesses ?? 0} aguardando`, icon: Store, color: 'bg-violet-50 text-violet-600', section: 'businesses' as const },
    { label: tx('Eventos'), value: dashboard?.stats.publishedEvents ?? 0, caption: `${dashboard?.stats.pendingEvents ?? 0} aguardando`, icon: CalendarDays, color: 'bg-amber-50 text-amber-600', section: 'events' as const },
    { label: tx('Sugestoes'), value: dashboard?.stats.newSuggestions ?? 0, caption: tx('Novas'), icon: MessageCircle, color: 'bg-slate-50 text-slate-500', section: 'moderation' as const },
  ];
  const pendingItems = [
    ...pendingAds.slice(0, 2).map((item) => ({ id: item.id, type: 'Anúncio', title: item.name, author: 'Gringoou Ads', date: '', color: 'bg-blue-50 text-blue-600', section: 'ads' as const })),
    ...(dashboard?.pendingPosts.slice(0, 2).map((item) => ({ id: item.id, type: 'Post', title: item.content, author: item.author.name || item.author.email || 'Usuário', date: relativeDate(item.createdAt), color: 'bg-red-50 text-red-600', section: 'moderation' as const })) ?? []),
    ...(dashboard?.pendingBusinesses.slice(0, 2).map((item) => ({ id: item.id, type: 'Negócio', title: item.name, author: item.createdBy.name || item.createdBy.email || 'Usuário', date: relativeDate(item.createdAt), color: 'bg-violet-50 text-violet-600', section: 'businesses' as const })) ?? []),
    ...(dashboard?.pendingEvents.slice(0, 1).map((item) => ({ id: item.id, type: 'Evento', title: item.title, author: item.createdBy.name || item.createdBy.email || 'Usuário', date: relativeDate(item.createdAt), color: 'bg-amber-50 text-amber-600', section: 'events' as const })) ?? []),
  ].slice(0, 7);

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-7 sm:px-7 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">{tx('Visão geral')}<InfoTip text={tx('Pendências, moderação e atalhos para os recursos da plataforma.')} /></h1>
        <div className="flex gap-3"><button type="button" aria-label={tx('Atualizar')} title={tx('Atualizar')} disabled={refreshing} onClick={onRefresh} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-surface text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"><RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} /></button></div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        {loading && !dashboard ? Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-surface sm:h-44" />) : kpis.map((item) => { const Icon = item.icon; return <button key={item.label} type="button" onClick={() => onNavigate(item.section)} className="group rounded-2xl border border-slate-200 bg-surface p-3.5 text-left sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.035)] transition hover:-translate-y-0.5 hover:border-blue-200"><div className="flex items-start justify-between"><span className={`flex h-8 w-8 items-center justify-center rounded-full sm:h-10 sm:w-10 ${item.color}`}><Icon size={17} /></span><span className="text-[11px] font-bold text-[#2B5DF5] opacity-0 transition group-hover:opacity-100">{tx('Ver →')}</span></div><p className="mt-2.5 text-2xl font-extrabold leading-none text-ink sm:mt-5 sm:text-3xl">{compactNumber.format(item.value)}</p><p className="mt-1 text-xs font-bold text-ink">{tx(item.label)}</p><p className="mt-0.5 truncate text-[11px] text-slate-400">{item.caption}</p></button>; })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card padded={false} className="rounded-2xl border border-slate-200 shadow-none">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5"><div className="flex items-center gap-2"><h2 className="font-extrabold">{tx('Pendências')}</h2><span className="rounded-full bg-[#FDF156]/45 px-2 py-0.5 text-[10px] font-bold text-amber-700">{totalPending}</span></div><button type="button" onClick={() => onNavigate('moderation')} className="text-xs font-bold text-[#2B5DF5]">{tx('Ver todas')}</button></div>
          <div className="divide-y divide-slate-100 px-6">
            {pendingItems.map((item) => <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 py-4"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.color}`}><Megaphone size={16} /></span><div className="min-w-0 flex-1"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.color}`}>{item.type}</span><p className="mt-1 truncate text-sm font-bold text-ink">{item.title}</p><p className="text-[11px] text-slate-400">{tx('por')} {item.author}{item.date ? ` · ${item.date}` : ''}</p></div><span className="hidden rounded-full bg-[#FDF156]/40 px-3 py-1 text-[10px] font-bold text-amber-700 sm:block">{tx('Pendente')}</span><Button variant="secondary" size="xs" onClick={() => onNavigate(item.section)}>{tx('Revisar')}</Button></div>)}
            {!pendingItems.length && !loading ? <div className="py-14 text-center"><CheckCircle2 className="mx-auto text-emerald-500" /><p className="mt-3 font-bold">{tx('Tudo em dia')}</p><p className="mt-1 text-sm text-slate-400">{tx('Não existem itens aguardando revisão.')}</p></div> : null}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-2xl border border-slate-200 shadow-none"><h2 className="text-sm font-extrabold">{tx('Resumo atual')}</h2><div className="mt-4 divide-y divide-slate-100">{[['Usuários cadastrados', dashboard?.stats.totalUsers ?? 0], ['Posts publicados', dashboard?.stats.publishedPosts ?? 0], ['Negócios publicados', dashboard?.stats.publishedBusinesses ?? 0], ['Eventos publicados', dashboard?.stats.publishedEvents ?? 0]].map(([label, value]) => <div key={String(label)} className="flex justify-between py-3 text-sm"><span className="text-slate-500">{tx(String(label))}</span><strong>{compactNumber.format(Number(value))}</strong></div>)}</div></Card>
          <Card className="rounded-2xl border border-slate-200 shadow-none"><h2 className="text-sm font-extrabold">{tx('Regiões ativas')}</h2><div className="mt-4 space-y-3">{dashboard?.regions.filter((region) => region.isActive).slice(0, 5).map((region) => <div key={region.key}><div className="flex justify-between text-xs"><strong>{tx(region.label)}</strong><span className="text-emerald-600">{tx('Ativa')}</span></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full w-full rounded-full bg-[#2B5DF5]" /></div></div>)}</div></Card>
          <Card className="rounded-2xl border border-slate-200 shadow-none"><h2 className="text-sm font-extrabold">{tx('Ações rapidas')}</h2><div className="mt-4 grid grid-cols-2 gap-3">{[['Usuários','users'],['Banners','banners'],['Importar','imports'],['Denuncias','moderation']].map(([label, section]) => <button key={label} type="button" onClick={() => onNavigate(section as Section)} className="rounded-2xl border border-slate-200 px-3 py-5 text-xs font-bold transition hover:border-blue-300 hover:bg-blue-50">{tx(label)}</button>)}</div></Card>
        </div>
      </div>
      <Card className="rounded-2xl border border-slate-200 shadow-none">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-extrabold uppercase tracking-wide text-[#2B5DF5]">{tx('Indicações')}</p><h2 className="mt-1 text-lg font-extrabold text-ink">{tx('Crescimento por convite')}</h2><p className="mt-1 text-xs text-slate-400">{tx('Dados reais dos vínculos de indicação já registrados.')}</p></div><div className="flex gap-6"><div><strong className="text-2xl text-ink">{dashboard?.referrals.total ?? 0}</strong><p className="text-xs text-slate-400">{tx('indicações')}</p></div><div><strong className="text-2xl text-emerald-600">{dashboard?.referrals.converted ?? 0}</strong><p className="text-xs text-slate-400">{tx('cadastros concluídos')}</p></div><div><strong className="text-2xl text-[#2B5DF5]">{dashboard?.referrals.conversionRate ?? 0}%</strong><p className="text-xs text-slate-400">{tx('conversão')}</p></div></div></div>
        {dashboard?.referrals.topReferrer ? <div className="mt-5 rounded-2xl bg-wash-1 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{tx('Maior indicador')}</p><p className="mt-1 font-bold text-ink">{dashboard.referrals.topReferrer.name || `@${dashboard.referrals.topReferrer.username}`}</p><p className="mt-1 text-xs text-slate-500">{dashboard.referrals.topReferrer.count} {tx('cadastros ·')} {dashboard.referrals.topReferrer.locationLabel || tx('Localidade não informada')}</p>{dashboard.referrals.topReferrer.interests.length ? <div className="mt-3 flex flex-wrap gap-2">{dashboard.referrals.topReferrer.interests.slice(0, 5).map((interest) => <span key={interest} className="rounded-full bg-surface px-3 py-1 text-[10px] font-semibold text-slate-600">{interest}</span>)}</div> : null}</div> : <p className="mt-5 text-sm text-slate-400">{tx('Ainda não há indicações convertidas.')}</p>}
      </Card>
    </div>
  );
}
