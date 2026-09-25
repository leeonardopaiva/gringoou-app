'use client';

import { CalendarDays, CheckCircle2, Clock3, MessageCircle, Megaphone, RefreshCcw, Store, Users } from 'lucide-react';
import { Button, Card } from '@/components/ui';

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
  const pendingAds = dashboard?.banners.filter((banner) => banner.paymentStatus === 'PAID' && banner.campaignStatus !== 'ACTIVE') ?? [];
  const totalPending = (dashboard?.stats.pendingBusinesses ?? 0) + (dashboard?.stats.pendingEvents ?? 0) + (dashboard?.stats.pendingPosts ?? 0) + pendingAds.length;
  const kpis = [
    { label: 'Pendencias', value: totalPending, caption: 'Requer atencao', icon: Clock3, color: 'bg-amber-100 text-amber-600', section: 'moderation' as const },
    { label: 'Anuncios', value: pendingAds.length, caption: 'Aguardando revisao', icon: Megaphone, color: 'bg-blue-50 text-[#2B5DF5]', section: 'ads' as const },
    { label: 'Usuarios', value: dashboard?.stats.totalUsers ?? 0, caption: 'Cadastrados', icon: Users, color: 'bg-emerald-50 text-emerald-600', section: 'users' as const },
    { label: 'Negocios', value: dashboard?.stats.publishedBusinesses ?? 0, caption: `${dashboard?.stats.pendingBusinesses ?? 0} aguardando`, icon: Store, color: 'bg-violet-50 text-violet-600', section: 'businesses' as const },
    { label: 'Eventos', value: dashboard?.stats.publishedEvents ?? 0, caption: `${dashboard?.stats.pendingEvents ?? 0} aguardando`, icon: CalendarDays, color: 'bg-amber-50 text-amber-600', section: 'events' as const },
    { label: 'Sugestoes', value: dashboard?.stats.newSuggestions ?? 0, caption: 'Novas', icon: MessageCircle, color: 'bg-slate-50 text-slate-500', section: 'moderation' as const },
  ];
  const pendingItems = [
    ...pendingAds.slice(0, 2).map((item) => ({ id: item.id, type: 'Anuncio', title: item.name, author: 'Gringoou Ads', date: '', color: 'bg-blue-50 text-blue-600', section: 'ads' as const })),
    ...(dashboard?.pendingPosts.slice(0, 2).map((item) => ({ id: item.id, type: 'Post', title: item.content, author: item.author.name || item.author.email || 'Usuario', date: relativeDate(item.createdAt), color: 'bg-red-50 text-red-600', section: 'moderation' as const })) ?? []),
    ...(dashboard?.pendingBusinesses.slice(0, 2).map((item) => ({ id: item.id, type: 'Negocio', title: item.name, author: item.createdBy.name || item.createdBy.email || 'Usuario', date: relativeDate(item.createdAt), color: 'bg-violet-50 text-violet-600', section: 'businesses' as const })) ?? []),
    ...(dashboard?.pendingEvents.slice(0, 1).map((item) => ({ id: item.id, type: 'Evento', title: item.title, author: item.createdBy.name || item.createdBy.email || 'Usuario', date: relativeDate(item.createdAt), color: 'bg-amber-50 text-amber-600', section: 'events' as const })) ?? []),
  ].slice(0, 7);

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-7 sm:px-7 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-extrabold tracking-tight text-[#132F40] sm:text-[28px]">Painel operacional</h1><p className="mt-1 text-sm text-slate-400">Acompanhe pendencias, modere conteudos e gerencie os recursos da plataforma.</p></div>
        <div className="flex gap-3"><select aria-label="Periodo" className="h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-medium outline-none"><option>Esta semana</option><option>Este mes</option></select><Button iconLeft={<RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />} disabled={refreshing} onClick={onRefresh}>Atualizar painel</Button></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {loading && !dashboard ? Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl bg-white" />) : kpis.map((item) => { const Icon = item.icon; return <button key={item.label} type="button" onClick={() => onNavigate(item.section)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-[0_2px_12px_rgba(15,23,42,0.035)] transition hover:-translate-y-0.5 hover:border-blue-200"><div className="flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-full ${item.color}`}><Icon size={19} /></span><span className="text-[11px] font-bold text-[#2B5DF5] opacity-0 transition group-hover:opacity-100">Ver →</span></div><p className="mt-5 text-3xl font-extrabold text-[#132F40]">{compactNumber.format(item.value)}</p><p className="mt-1 text-xs font-bold text-[#132F40]">{item.label}</p><p className="mt-1 text-[11px] text-slate-400">{item.caption}</p></button>; })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card padded={false} className="rounded-2xl border border-slate-200 shadow-none">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5"><div className="flex items-center gap-2"><h2 className="font-extrabold">Pendencias</h2><span className="rounded-full bg-[#FDF156]/45 px-2 py-0.5 text-[10px] font-bold text-amber-700">{totalPending}</span></div><button type="button" onClick={() => onNavigate('moderation')} className="text-xs font-bold text-[#2B5DF5]">Ver todas</button></div>
          <div className="divide-y divide-slate-100 px-6">
            {pendingItems.map((item) => <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 py-4"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.color}`}><Megaphone size={16} /></span><div className="min-w-0 flex-1"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.color}`}>{item.type}</span><p className="mt-1 truncate text-sm font-bold text-[#132F40]">{item.title}</p><p className="text-[11px] text-slate-400">por {item.author}{item.date ? ` · ${item.date}` : ''}</p></div><span className="hidden rounded-full bg-[#FDF156]/40 px-3 py-1 text-[10px] font-bold text-amber-700 sm:block">Pendente</span><Button variant="secondary" size="xs" onClick={() => onNavigate(item.section)}>Revisar</Button></div>)}
            {!pendingItems.length && !loading ? <div className="py-14 text-center"><CheckCircle2 className="mx-auto text-emerald-500" /><p className="mt-3 font-bold">Tudo em dia</p><p className="mt-1 text-sm text-slate-400">Nao existem itens aguardando revisao.</p></div> : null}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-2xl border border-slate-200 shadow-none"><h2 className="text-sm font-extrabold">Resumo atual</h2><div className="mt-4 divide-y divide-slate-100">{[['Usuarios cadastrados', dashboard?.stats.totalUsers ?? 0], ['Posts publicados', dashboard?.stats.publishedPosts ?? 0], ['Negocios publicados', dashboard?.stats.publishedBusinesses ?? 0], ['Eventos publicados', dashboard?.stats.publishedEvents ?? 0]].map(([label, value]) => <div key={String(label)} className="flex justify-between py-3 text-sm"><span className="text-slate-500">{label}</span><strong>{compactNumber.format(Number(value))}</strong></div>)}</div></Card>
          <Card className="rounded-2xl border border-slate-200 shadow-none"><h2 className="text-sm font-extrabold">Regioes ativas</h2><div className="mt-4 space-y-3">{dashboard?.regions.filter((region) => region.isActive).slice(0, 5).map((region) => <div key={region.key}><div className="flex justify-between text-xs"><strong>{region.label}</strong><span className="text-emerald-600">Ativa</span></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full w-full rounded-full bg-[#2B5DF5]" /></div></div>)}</div></Card>
          <Card className="rounded-2xl border border-slate-200 shadow-none"><h2 className="text-sm font-extrabold">Acoes rapidas</h2><div className="mt-4 grid grid-cols-2 gap-3">{[['Usuarios','users'],['Banners','banners'],['Importar','imports'],['Denuncias','moderation']].map(([label, section]) => <button key={label} type="button" onClick={() => onNavigate(section as Section)} className="rounded-2xl border border-slate-200 px-3 py-5 text-xs font-bold transition hover:border-blue-300 hover:bg-blue-50">{label}</button>)}</div></Card>
        </div>
      </div>
      <Card className="rounded-2xl border border-slate-200 shadow-none">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2B5DF5]">Indicações</p><h2 className="mt-1 text-lg font-extrabold text-[#132F40]">Crescimento por convite</h2><p className="mt-1 text-xs text-slate-400">Dados reais dos vínculos de indicação já registrados.</p></div><div className="flex gap-6"><div><strong className="text-2xl text-[#132F40]">{dashboard?.referrals.total ?? 0}</strong><p className="text-xs text-slate-400">indicações</p></div><div><strong className="text-2xl text-emerald-600">{dashboard?.referrals.converted ?? 0}</strong><p className="text-xs text-slate-400">cadastros concluídos</p></div><div><strong className="text-2xl text-[#2B5DF5]">{dashboard?.referrals.conversionRate ?? 0}%</strong><p className="text-xs text-slate-400">conversão</p></div></div></div>
        {dashboard?.referrals.topReferrer ? <div className="mt-5 rounded-2xl bg-[#F8FAFC] p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Maior indicador</p><p className="mt-1 font-bold text-[#132F40]">{dashboard.referrals.topReferrer.name || `@${dashboard.referrals.topReferrer.username}`}</p><p className="mt-1 text-xs text-slate-500">{dashboard.referrals.topReferrer.count} cadastros · {dashboard.referrals.topReferrer.locationLabel || 'Localidade não informada'}</p>{dashboard.referrals.topReferrer.interests.length ? <div className="mt-3 flex flex-wrap gap-2">{dashboard.referrals.topReferrer.interests.slice(0, 5).map((interest) => <span key={interest} className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-600">{interest}</span>)}</div> : null}</div> : <p className="mt-5 text-sm text-slate-400">Ainda não há indicações convertidas.</p>}
      </Card>
    </div>
  );
}
