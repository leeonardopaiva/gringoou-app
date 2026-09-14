'use client';

import { useMemo } from 'react';
import { Activity, CalendarDays, ImageIcon, RefreshCcw, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui';

type AnalyticsEvent = {
  id: string;
  type: 'disabled_feature_click' | 'banner_click' | 'banner_registration' | 'search_query';
  targetKey: string;
  label: string;
  sourcePath: string | null;
  sourceSection: string | null;
  createdAt: string;
  user: { name: string | null; username: string | null; email: string | null } | null;
};

export type AdminAnalyticsData = {
  windowDays: number;
  selectedUser: { name: string | null; username: string | null; email: string | null } | null;
  summary: { totalEvents: number; disabledFeatureClicks: number; bannerClicks: number; searchQueries: number; trackedUsers: number };
  topDisabledFeatures: Array<{ targetKey: string; label: string; sourceSection: string | null; count: number }>;
  topBanners: Array<{ targetKey: string; label: string; count: number }>;
  topSources: Array<{ sourceSection: string; count: number }>;
  topSearchesByRegion: Array<{ term: string; regionKey: string | null; regionLabel: string; count: number }>;
  dailyActivity: Array<{ date: string; totalEvents: number; bannerClicks: number; searchQueries: number }>;
  activeRegions: Array<{ regionKey: string; count: number }>;
  recentEvents: AnalyticsEvent[];
};

type Region = { key: string; label: string };

type Props = {
  data: AdminAnalyticsData | null;
  loading: boolean;
  days: string;
  regionFilter: string;
  regions: Region[];
  onDaysChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onRefresh: () => void;
  onClearUser: () => void;
};

const sourceColors = ['#118DF0', '#7C3AED', '#EC3F9F', '#16A34A', '#F59E0B', '#64748B'];

const formatEventType = (type: AnalyticsEvent['type']) => {
  if (type === 'banner_click') return 'Clique em banner';
  if (type === 'banner_registration') return 'Cadastro em banner';
  if (type === 'search_query') return 'Busca';
  return 'Recurso desativado';
};

const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
}).format(new Date(value));

function groupActivity(items: AdminAnalyticsData['dailyActivity']) {
  if (items.length <= 30) return items;
  const groupSize = Math.ceil(items.length / 30);
  const grouped: AdminAnalyticsData['dailyActivity'] = [];
  for (let index = 0; index < items.length; index += groupSize) {
    const group = items.slice(index, index + groupSize);
    grouped.push({
      date: group[group.length - 1].date,
      totalEvents: group.reduce((total, item) => total + item.totalEvents, 0),
      bannerClicks: group.reduce((total, item) => total + item.bannerClicks, 0),
      searchQueries: group.reduce((total, item) => total + item.searchQueries, 0),
    });
  }
  return grouped;
}

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 ${className}`}>{children}</div>
);

export default function AdminAnalyticsSection({ data, loading, days, regionFilter, regions, onDaysChange, onRegionChange, onRefresh, onClearUser }: Props) {
  const activity = useMemo(() => groupActivity(data?.dailyActivity ?? []), [data?.dailyActivity]);
  const activityMax = Math.max(...activity.map((item) => item.totalEvents), 1);
  const regionNames = new Map(regions.map((region) => [region.key, region.label]));
  const maxRegionCount = Math.max(...(data?.activeRegions ?? []).map((region) => region.count), 1);
  const sourceTotal = (data?.topSources ?? []).reduce((total, source) => total + source.count, 0);
  let sourceProgress = 0;
  const sourceGradient = (data?.topSources ?? []).map((source, index) => {
    const start = sourceProgress;
    sourceProgress += sourceTotal ? (source.count / sourceTotal) * 100 : 0;
    return `${sourceColors[index % sourceColors.length]} ${start}% ${sourceProgress}%`;
  }).join(', ');

  const heatmap = useMemo(() => {
    const searches = data?.topSearchesByRegion ?? [];
    const terms = [...new Set(searches.map((item) => item.term))].slice(0, 5);
    const regionKeys = [...new Set(searches.map((item) => item.regionKey || 'sem-regiao'))].slice(0, 6);
    const max = Math.max(...searches.map((item) => item.count), 1);
    return { terms, regionKeys, max, searches };
  }, [data?.topSearchesByRegion]);

  const exportCsv = () => {
    if (!data?.recentEvents.length) return;
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = data.recentEvents.map((event) => [event.label, formatEventType(event.type), event.targetKey, event.sourcePath || '', event.user?.username || event.user?.email || 'Anonimo', event.createdAt]);
    const csv = [['Evento', 'Tipo', 'Destino', 'Pagina', 'Usuario', 'Data'], ...rows].map((row) => row.map((cell) => escape(String(cell))).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Admin · Analytics</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Analytics da Plataforma</h1>
          <p className="mt-1 text-sm text-slate-500">Analise uso, buscas, campanhas e interacoes com dados reais da plataforma.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <label className="relative">
            <span className="sr-only">Periodo</span>
            <CalendarDays size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <select value={days} onChange={(event) => onDaysChange(event.target.value)} className="h-11 w-full appearance-none rounded-full border border-slate-200 bg-white pl-10 pr-8 text-sm font-semibold text-slate-700 outline-none focus:border-[#2B5DF5] sm:w-auto">
              <option value="7">Ultimos 7 dias</option><option value="30">Ultimos 30 dias</option><option value="90">Ultimos 90 dias</option><option value="365">Ultimos 12 meses</option>
            </select>
          </label>
          <select aria-label="Localidade" value={regionFilter} onChange={(event) => onRegionChange(event.target.value)} className="h-11 min-w-0 appearance-none rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-[#2B5DF5] sm:min-w-44">
            <option value="">Todas as regioes</option>{regions.map((region) => <option key={region.key} value={region.key}>{region.label}</option>)}
          </select>
          <Button className="col-span-2 sm:col-auto" iconLeft={<RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />} onClick={onRefresh} disabled={loading}>Atualizar</Button>
        </div>
      </div>

      {data?.selectedUser ? <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filtro de usuario</p><p className="font-bold text-slate-900">{data.selectedUser.name || data.selectedUser.email || 'Usuario sem nome'}</p></div><button type="button" onClick={onClearUser} className="self-start rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 sm:self-auto">Ver analytics geral</button></Card> : null}

      {!data && loading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-2xl bg-slate-200" />)}</div> : null}

      {data ? <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Usuarios ativos', value: data.summary.trackedUsers, icon: Users, color: '#16A34A', bars: [] as number[] },
            { label: 'Eventos rastreados', value: data.summary.totalEvents, icon: Activity, color: '#118DF0', bars: activity.slice(-10).map((item) => item.totalEvents) },
            { label: 'Cliques em banners', value: data.summary.bannerClicks, icon: ImageIcon, color: '#7C3AED', bars: activity.slice(-10).map((item) => item.bannerClicks) },
            { label: 'Buscas feitas', value: data.summary.searchQueries, icon: Search, color: '#EC3F9F', bars: activity.slice(-10).map((item) => item.searchQueries) },
          ].map(({ label, value, icon: Icon, color, bars }) => {
            const barsMax = Math.max(...bars, 1);
            return <Card key={label} className="min-h-40 p-5"><div className="flex items-center justify-between"><p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-slate-400">{label}</p><Icon size={17} style={{ color }} /></div><p className="mt-2 text-3xl font-extrabold text-slate-900">{value.toLocaleString('pt-BR')}</p>{bars.length ? <div className="mt-5 flex h-9 items-end gap-1.5" aria-hidden>{bars.map((count, index) => <span key={index} className="flex-1 rounded-t" style={{ height: `${Math.max(8, count / barsMax * 100)}%`, backgroundColor: `${color}2e` }} />)}</div> : <div className="mt-5 h-9 border-b-2 border-dashed border-slate-100" />}<p className="mt-2 text-xs text-slate-400">Total no periodo</p></Card>;
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)]">
          <Card className="min-w-0 p-5 sm:p-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-extrabold text-slate-900">Atividade por dia</h2><p className="text-xs text-slate-400">Eventos, cliques e buscas no periodo</p></div><div className="flex flex-wrap gap-3 text-[11px] text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#118DF0]" />Eventos</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-600" />Cliques</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-pink-500" />Buscas</span></div></div><div className="mt-6 overflow-x-auto pb-2"><div className="flex h-48 min-w-[620px] items-end gap-2 border-b border-slate-100">{activity.map((item, index) => <div key={item.date} className="flex h-full min-w-3 flex-1 flex-col justify-end"><div className="flex h-[150px] items-end justify-center gap-0.5"><span title={`${item.totalEvents} eventos`} className="w-1/3 rounded-t bg-[#BFE3FF]" style={{ height: `${Math.max(3, item.totalEvents / activityMax * 100)}%` }} /><span title={`${item.bannerClicks} cliques`} className="w-1/3 rounded-t bg-violet-300" style={{ height: `${Math.max(3, item.bannerClicks / activityMax * 100)}%` }} /><span title={`${item.searchQueries} buscas`} className="w-1/3 rounded-t bg-pink-200" style={{ height: `${Math.max(3, item.searchQueries / activityMax * 100)}%` }} /></div>{(index === 0 || index === activity.length - 1 || index % 5 === 0) ? <span className="mt-2 text-center text-[9px] text-slate-400">{item.date.slice(5).replace('-', '/')}</span> : <span className="mt-2 h-3" />}</div>)}</div></div></Card>
          <Card className="p-5"><h2 className="font-extrabold text-slate-900">Origens</h2>{sourceTotal ? <><div className="mx-auto mt-5 grid h-32 w-32 place-items-center rounded-full" style={{ background: `conic-gradient(${sourceGradient})` }}><div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center"><span><strong className="block text-xl text-slate-900">{sourceTotal}</strong><small className="text-slate-400">total</small></span></div></div><div className="mt-5 space-y-2">{data.topSources.slice(0, 6).map((source, index) => <div key={source.sourceSection} className="flex items-center gap-2 text-xs"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: sourceColors[index % sourceColors.length] }} /><span className="min-w-0 flex-1 truncate text-slate-500">{source.sourceSection}</span><strong className="text-slate-700">{Math.round(source.count / sourceTotal * 100)}%</strong></div>)}</div></> : <p className="mt-6 text-sm text-slate-400">Sem interacoes no periodo.</p>}</Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(240px,0.85fr)_minmax(240px,0.85fr)]">
          <Card className="min-w-0 p-5 sm:p-6"><h2 className="font-extrabold text-slate-900">Palavras mais buscadas por localidade</h2><p className="text-xs text-slate-400">Intensidade de busca por regiao</p>{heatmap.terms.length ? <div className="mt-5 overflow-x-auto"><div className="grid min-w-[520px] gap-2 text-xs" style={{ gridTemplateColumns: `110px repeat(${heatmap.regionKeys.length}, minmax(54px, 1fr))` }}><span />{heatmap.regionKeys.map((key) => <span key={key} className="truncate text-center text-slate-400">{regionNames.get(key) || key}</span>)}{heatmap.terms.map((term) => <div key={term} className="contents"><span className="truncate py-2 text-slate-500">{term}</span>{heatmap.regionKeys.map((key) => { const count = heatmap.searches.find((item) => item.term === term && (item.regionKey || 'sem-regiao') === key)?.count ?? 0; return <span key={key} title={`${count} buscas`} className="h-9 rounded-lg bg-[#2B5DF5]" style={{ opacity: count ? Math.max(.18, count / heatmap.max) : .06 }} />; })}</div>)}</div></div> : <p className="mt-6 text-sm text-slate-400">As buscas aparecerao aqui quando houver dados.</p>}</Card>
          <Card className="p-5"><h2 className="font-extrabold text-slate-900">Banners mais clicados</h2><div className="mt-4 space-y-4">{data.topBanners.length ? data.topBanners.slice(0, 5).map((banner) => { const max = Math.max(...data.topBanners.map((item) => item.count), 1); return <div key={banner.targetKey}><div className="flex gap-2 text-xs"><span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{banner.label}</span><strong>{banner.count}</strong></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#118DF0]" style={{ width: `${banner.count / max * 100}%` }} /></div></div>; }) : <p className="text-sm text-slate-400">Nenhum clique no periodo.</p>}</div><div className="my-5 border-t border-slate-100" /><h3 className="font-extrabold text-slate-900">Recursos clicados</h3><div className="mt-3 space-y-3">{data.topDisabledFeatures.slice(0, 4).map((feature) => <div key={`${feature.targetKey}-${feature.sourceSection}`} className="flex gap-2 text-xs"><span className="min-w-0 flex-1 truncate text-slate-600">{feature.label}</span><strong>{feature.count}</strong></div>)}</div></Card>
          <Card className="p-5"><h2 className="font-extrabold text-slate-900">Regioes ativas</h2><div className="mt-4 space-y-4">{data.activeRegions.length ? data.activeRegions.slice(0, 6).map((region) => <div key={region.regionKey}><div className="flex gap-2 text-xs"><span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{regionNames.get(region.regionKey) || region.regionKey}</span><span className="text-slate-400">{region.count}</span></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2B5DF5]" style={{ width: `${region.count / maxRegionCount * 100}%` }} /></div></div>) : <p className="text-sm text-slate-400">Sem regioes identificadas.</p>}</div></Card>
        </div>

        <Card className="min-w-0 p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="font-extrabold text-slate-900">Eventos recentes</h2><p className="text-xs text-slate-400">Atividade mais recente na plataforma</p></div><button type="button" onClick={exportCsv} disabled={!data.recentEvents.length} className="text-xs font-bold text-[#118DF0] disabled:text-slate-300">Exportar CSV</button></div>{data.recentEvents.length ? <><div className="mt-5 hidden overflow-x-auto md:block"><table className="w-full min-w-[850px] text-left text-xs"><thead className="border-b border-slate-200 uppercase tracking-wider text-slate-400"><tr><th className="py-3">Evento</th><th>Tipo</th><th>Destino</th><th>Pagina</th><th>Usuario</th><th>Data</th></tr></thead><tbody>{data.recentEvents.map((event) => <tr key={event.id} className="border-b border-slate-100 last:border-0"><td className="py-4 font-bold text-slate-700">{event.label}</td><td><span className="rounded-full bg-sky-50 px-2 py-1 font-semibold text-sky-600">{formatEventType(event.type)}</span></td><td className="text-slate-500">{event.targetKey}</td><td className="text-slate-400">{event.sourcePath || '—'}</td><td className="text-[#118DF0]">{event.user?.username ? `@${event.user.username}` : event.user?.email || 'Anonimo'}</td><td className="text-slate-400">{formatDate(event.createdAt)}</td></tr>)}</tbody></table></div><div className="mt-4 space-y-3 md:hidden">{data.recentEvents.map((event) => <div key={event.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-start justify-between gap-2"><strong className="text-sm text-slate-800">{event.label}</strong><span className="shrink-0 text-[10px] text-slate-400">{formatDate(event.createdAt)}</span></div><p className="mt-1 text-xs font-semibold text-sky-600">{formatEventType(event.type)}</p><p className="mt-2 truncate text-xs text-slate-500">{event.sourcePath || event.targetKey}</p></div>)}</div></> : <p className="mt-5 text-sm text-slate-400">Nenhum evento rastreado no periodo selecionado.</p>}</Card>
      </> : null}
    </section>
  );
}
