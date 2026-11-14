'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Copy, Download, Filter, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Alert, Badge, Button, Card, ConfirmModal, Input, Modal, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/feedback/ToastProvider';
import CloudinaryImageField from '@/components/forms/CloudinaryImageField';
import { Popover } from '@/components/ui/Popover';
import { useAdAccount } from '@/components/ads/AdAccountProvider';
import {
  formatNumber,
  formatPercent,
  formatUsd,
  formatUsdWithCents,
  type AdsOverviewData,
  type AdsOverviewRow,
} from '@/lib/ads/dashboard';

type OverviewDashboardProps = { data: AdsOverviewData };
type StatusView = { label: string; tone: 'success' | 'destaque' | 'erro' | 'neutro' };
type RevisionForm = { headline: string; description: string; imageUrl: string; ctaLabel: string; destination: string };

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(value));
}

function getStatus(row: AdsOverviewRow, enabled: boolean): StatusView {
  if (row.moderationStatus === 'DRAFT') return { label: 'Rascunho', tone: 'neutro' };
  if (row.moderationStatus === 'REJECTED') return { label: 'Rejeitado', tone: 'erro' };
  if (!enabled && row.moderationStatus === 'APPROVED' && !(row.endsAt && new Date(row.endsAt).getTime() < Date.now())) return { label: 'Pausado', tone: 'erro' };
  if (row.moderationStatus === 'PENDING_REVIEW') return { label: 'Em analise', tone: 'destaque' };
  if (row.endsAt && new Date(row.endsAt).getTime() < Date.now()) return { label: 'Concluido', tone: 'neutro' };
  if (row.moderationStatus === 'APPROVED' && row.paymentStatus === 'PAID') return { label: 'Ativo', tone: 'success' };
  return { label: 'Inativo', tone: 'neutro' };
}

type TabKey = 'all' | 'active' | 'review' | 'draft' | 'rejected' | 'paused' | 'ended';
const TABS: Array<{ key: TabKey; label: string; labels: string[] | null }> = [
  { key: 'all', label: 'Todas', labels: null },
  { key: 'active', label: 'Ativas', labels: ['Ativo'] },
  { key: 'review', label: 'Em análise', labels: ['Em analise'] },
  { key: 'draft', label: 'Rascunhos', labels: ['Rascunho'] },
  { key: 'rejected', label: 'Rejeitadas', labels: ['Rejeitado'] },
  { key: 'paused', label: 'Pausadas', labels: ['Pausado', 'Inativo'] },
  { key: 'ended', label: 'Concluídas', labels: ['Concluido'] },
];
const GOAL_LABELS: Record<string, string> = { WHATSAPP: 'WhatsApp', EXTERNAL_URL: 'Link externo', MARKETPLACE: 'Marketplace' };

const csvCell = (value: unknown) => {
  const text = value == null ? '' : String(value);
  return /["\n;]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
};

export function OverviewDashboard({ data }: OverviewDashboardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { account } = useAdAccount();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<TabKey>('all');
  const [goalFilter, setGoalFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLButtonElement>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState<AdsOverviewRow | null>(null);
  const [enabledRows, setEnabledRows] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(data.rows.map((row) => [row.id, row.isActive])),
  );
  const [revising, setRevising] = useState<AdsOverviewRow | null>(null);
  const [revisionForm, setRevisionForm] = useState<RevisionForm | null>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [removing, setRemoving] = useState<AdsOverviewRow | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const isOwner = account?.role === 'BUSINESS_ADMIN';
  const canRemove = (row: AdsOverviewRow) => isOwner && row.moderationStatus !== 'PENDING_REVIEW' && !(row.moderationStatus === 'APPROVED' && (enabledRows[row.id] ?? false) && (!row.endsAt || new Date(row.endsAt) > new Date()));
  const removeCampaign = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      const response = await fetch(`/api/ads/${removing.id}/archive`, { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível remover a campanha.');
      showToast('Campanha removida do painel.', 'success');
      setRemoving(null);
      router.refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Não foi possível remover a campanha.', 'error');
    } finally {
      setRemoveBusy(false);
    }
  };
  const rowStatus = (row: AdsOverviewRow) => getStatus(row, enabledRows[row.id] ?? false).label;
  const tabCounts = useMemo(() => {
    const counts = Object.fromEntries(TABS.map((item) => [item.key, 0])) as Record<TabKey, number>;
    for (const row of data.rows) {
      const label = getStatus(row, enabledRows[row.id] ?? false).label;
      counts.all += 1;
      for (const item of TABS) if (item.labels?.includes(label)) counts[item.key] += 1;
    }
    return counts;
  }, [data.rows, enabledRows]);
  const goals = useMemo(() => [...new Set(data.rows.map((row) => row.goal).filter(Boolean))] as string[], [data.rows]);
  const plans = useMemo(() => [...new Set(data.rows.map((row) => row.plan).filter(Boolean))] as string[], [data.rows]);
  const activeFilters = Number(Boolean(goalFilter)) + Number(Boolean(planFilter));
  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const tabLabels = TABS.find((item) => item.key === tab)?.labels ?? null;
    return data.rows.filter((row) => {
      const label = getStatus(row, enabledRows[row.id] ?? false).label;
      if (tabLabels && !tabLabels.includes(label)) return false;
      if (goalFilter && row.goal !== goalFilter) return false;
      if (planFilter && row.plan !== planFilter) return false;
      if (!normalized) return true;
      return [row.label, row.goal && GOAL_LABELS[row.goal], row.plan, row.regionLabel, label].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [data.rows, enabledRows, goalFilter, planFilter, query, tab]);
  const totals = useMemo(
    () => visibleRows.reduce((acc, row) => ({ spendCents: acc.spendCents + row.spendCents, impressions: acc.impressions + row.impressions, clicks: acc.clicks + row.clicks, conversions: acc.conversions + row.conversions }), { spendCents: 0, impressions: 0, clicks: 0, conversions: 0 }),
    [visibleRows],
  );
  const canEdit = account?.role === 'BUSINESS_ADMIN' || account?.role === 'ADMIN' || account?.role === 'EDITOR';
  const clearFilters = () => { setTab('all'); setGoalFilter(''); setPlanFilter(''); setQuery(''); };
  const duplicateCampaign = async (row: AdsOverviewRow) => {
    setBusyId(row.id);
    try {
      const response = await fetch(`/api/ads/${row.id}/duplicate`, { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível duplicar a campanha.');
      showToast('Cópia criada como rascunho.', 'success');
      router.push(`/ads/wizard?draft=${encodeURIComponent(payload.id)}`);
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Não foi possível duplicar a campanha.', 'error');
    } finally {
      setBusyId(null);
    }
  };
  const discardDraft = async () => {
    if (!discarding) return;
    setRemoveBusy(true);
    try {
      const response = await fetch(`/api/ads/${discarding.id}/discard`, { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível descartar o rascunho.');
      try { Object.keys(sessionStorage).filter((key) => key.startsWith('gringoou:ad-wizard-draft')).forEach((key) => sessionStorage.removeItem(key)); } catch { /* sessionStorage indisponível */ }
      showToast('Rascunho descartado.', 'success');
      setDiscarding(null);
      router.refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Não foi possível descartar o rascunho.', 'error');
    } finally {
      setRemoveBusy(false);
    }
  };
  const exportCsv = () => {
    if (!visibleRows.length) { showToast('Não há campanhas para exportar.', 'error'); return; }
    const header = ['Nome', 'Status', 'Objetivo', 'Pacote', 'Região', 'Início', 'Fim', 'Impressões', 'Cliques', 'Conversões', 'Gasto (USD)', 'CTR', 'CPC (USD)'];
    const lines = visibleRows.map((row) => [row.label, rowStatus(row), row.goal ? GOAL_LABELS[row.goal] ?? row.goal : '', row.plan ?? '', row.regionLabel ?? '', formatDate(row.startsAt), formatDate(row.endsAt), row.impressions, row.clicks, row.conversions, (row.spendCents / 100).toFixed(2), (row.ctr * 100).toFixed(2) + '%', row.cpcCents == null ? '' : (row.cpcCents / 100).toFixed(2)].map(csvCell).join(';'));
    const blob = new Blob([String.fromCharCode(0xfeff) + [header.map(csvCell).join(';'), ...lines].join(String.fromCharCode(13, 10))], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'campanhas-' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    URL.revokeObjectURL(url);
  };
  const rangeCaption = data.range.from && data.range.key !== 'all'
    ? `${formatDate(data.range.from.toISOString())} - ${formatDate(data.range.to.toISOString())}`
    : 'Todo o periodo';
  const canToggle = (row: AdsOverviewRow) => row.moderationStatus === 'APPROVED' && row.paymentStatus === 'PAID' && (!row.endsAt || new Date(row.endsAt).getTime() > Date.now());
  const toggleCampaign = async (row: AdsOverviewRow) => {
    const previous = enabledRows[row.id] ?? false;
    const next = !previous;
    setEnabledRows((current) => ({ ...current, [row.id]: next }));
    try {
      const response = await fetch(`/api/ads/${row.id}/toggle`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: next }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Nao foi possivel atualizar a campanha.');
      router.refresh();
    } catch (reason) {
      setEnabledRows((current) => ({ ...current, [row.id]: previous }));
      showToast(reason instanceof Error ? reason.message : 'Nao foi possivel atualizar a campanha.', 'error');
    }
  };
  const openRevision = (row: AdsOverviewRow) => {
    setRevising(row);
    setRevisionForm({
      headline: row.label,
      description: row.description ?? '',
      imageUrl: row.imageUrl ?? '',
      ctaLabel: row.ctaLabel ?? 'Saiba mais',
      destination: row.destination ?? '',
    });
  };
  const resubmit = async () => {
    if (!revising || !revisionForm) return;
    setResubmitting(true);
    try {
      const response = await fetch(`/api/ads/${revising.id}/resubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...revisionForm, goal: revising.goal }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Nao foi possivel reenviar a campanha.');
      setRevising(null);
      setRevisionForm(null);
      showToast('Criativo reenviado para analise sem nova cobranca.', 'success');
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Nao foi possivel reenviar a campanha.', 'error');
    } finally {
      setResubmitting(false);
    }
  };
  const stats = [
    { label: 'Gasto faturavel', value: formatUsd(data.stats.spendCents), caption: rangeCaption },
    { label: 'Impressoes', value: formatNumber(data.stats.impressions), caption: rangeCaption },
    { label: 'Campanhas ativas', value: String(data.stats.activeCampaigns), caption: `de ${data.rows.length} campanhas totais`, accent: true },
    { label: 'Criativos rejeitados', value: String(data.stats.rejectedCreatives), caption: data.stats.rejectedCreatives ? 'requer sua atencao' : 'nenhuma pendencia' },
  ];

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-7">
      {!account?.businessId ? (
        <Alert tone="atencao" title="Crie a página do negócio para começar a promover." className="items-center rounded-full border-amber-300 bg-amber-50 px-6 py-4 shadow-none">
          <button type="button" onClick={() => router.push(`/businesses?create=1&adAccountId=${encodeURIComponent(account?.id || '')}`)} className="text-sm font-bold text-brand-500 underline underline-offset-2">Criar página</button>
        </Alert>
      ) : account.businessStatus !== 'PUBLISHED' ? (
        <Alert tone="atencao" title="Página em análise. Após a aprovação, você poderá continuar e concluir a campanha." className="items-center rounded-full border-amber-300 bg-amber-50 px-6 py-4 shadow-none">
          {account.publicPath ? <button type="button" onClick={() => router.push(`${account.publicPath}/gerenciar`)} className="text-sm font-bold text-brand-500 underline underline-offset-2">Ver página</button> : null}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold leading-none text-[#132f40] sm:text-[34px]">Visão geral</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={data.range.key} prefixIcon={<CalendarDays size={17} />} onChange={(event) => router.push(`/ads/overview?range=${event.target.value}`)} className="min-w-[150px]">
            <option value="7d">Ultimos 7 dias</option><option value="month">Este mes</option><option value="all">Total</option>
          </Select>
          <Button iconLeft={<Plus size={19} />} onClick={() => router.push('/ads/wizard')}>Criar Campanha</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="relative min-h-[104px] overflow-hidden rounded-2xl border border-slate-200 px-4 py-4 shadow-sm sm:min-h-[150px] sm:px-7 sm:py-6">
            <span className={`absolute inset-x-0 top-0 h-1 ${stat.accent ? 'bg-[#339eff]' : 'bg-slate-200'}`} aria-hidden />
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 sm:text-[12px]">{stat.label}</p>
            <p className={`mt-3 text-2xl font-extrabold leading-none sm:mt-6 sm:text-[34px] ${stat.accent ? 'text-brand-500' : 'text-[#132f40]'}`}>{stat.value}</p>
            <p className="mt-2 truncate text-[11px] text-slate-400 sm:mt-3 sm:text-[13px]">{stat.caption}</p>
          </Card>
        ))}
      </div>

      <Card padded={false} className="rounded-[22px] border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 pt-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex gap-6 overflow-x-auto" role="tablist" aria-label="Filtrar campanhas por situação">
            {TABS.filter((item) => item.key === 'all' || item.key === tab || tabCounts[item.key] > 0).map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                onClick={() => setTab(item.key)}
                className={`whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-bold transition ${tab === item.key ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                {item.label} <span className="ml-1 text-xs font-semibold opacity-70">{tabCounts[item.key]}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 pb-3">
            <Button size="sm" iconOnly aria-label="Nova campanha" title="Nova campanha" iconLeft={<Plus size={17} />} onClick={() => router.push('/ads/wizard')} />
            <Button size="sm" iconOnly variant="ghost" aria-label="Exportar CSV" title="Exportar a lista atual em CSV" iconLeft={<Download size={16} />} className="bg-slate-50 text-slate-500" onClick={exportCsv} />
            <div className="w-full sm:w-[190px]"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar..." aria-label="Buscar campanhas" prefixIcon={<Search size={16} />} /></div>
            <Button ref={filterRef} size="sm" iconOnly variant="ghost" aria-label="Filtros" title="Filtros" aria-expanded={filterOpen} iconLeft={<Filter size={16} />} className={activeFilters ? 'bg-brand-50 text-brand-500' : 'text-slate-500'} onClick={() => setFilterOpen((value) => !value)} />
            <Popover open={filterOpen} onClose={() => setFilterOpen(false)} anchorRef={filterRef} align="end" role="dialog" className="w-72 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-extrabold text-[#132f40]">Filtros</p>
                <button type="button" aria-label="Fechar filtros" onClick={() => setFilterOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>
              <label className="mt-3 block text-xs font-bold text-slate-500">Objetivo</label>
              <Select value={goalFilter} onChange={(event) => setGoalFilter(event.target.value)} className="mt-1">
                <option value="">Todos</option>
                {goals.map((goal) => <option key={goal} value={goal}>{GOAL_LABELS[goal] ?? goal}</option>)}
              </Select>
              <label className="mt-3 block text-xs font-bold text-slate-500">Pacote</label>
              <Select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)} className="mt-1">
                <option value="">Todos</option>
                {plans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
              </Select>
              <div className="mt-4 flex justify-between">
                <Button size="sm" variant="ghost" disabled={!activeFilters} onClick={() => { setGoalFilter(''); setPlanFilter(''); }}>Limpar</Button>
                <Button size="sm" onClick={() => setFilterOpen(false)}>Aplicar</Button>
              </div>
            </Popover>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left">
            <thead><tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
              {['Nome', 'On/Off', 'Status', 'Inicio', 'Fim', 'Impressoes', 'Cliques', 'Conv.', 'Gasto', 'CTR', 'CPC', 'Ações'].map((label) => <th key={label} className="px-5 py-4">{label}</th>)}
            </tr></thead>
            <tbody>
              {visibleRows.map((row) => {
                const enabled = enabledRows[row.id] ?? false;
                const status = getStatus(row, enabled);
                const isDraft = row.moderationStatus === 'DRAFT';
                const toggleable = canToggle(row);
                return (
                  <tr key={row.id} className="border-b border-slate-100 text-[13px] text-[#243b53] hover:bg-slate-50/70">
                    <td className="max-w-[260px] px-5 py-4 font-bold">
                      <span className="block truncate">{row.label}</span>
                      <span className="mt-1 flex flex-wrap gap-x-3">{row.moderationStatus === 'REJECTED' ? <button type="button" onClick={() => openRevision(row)} className="text-xs font-bold text-brand-500 underline underline-offset-2">Corrigir e reenviar</button> : null}{isDraft && canEdit ? <button type="button" onClick={() => router.push(`/ads/wizard?draft=${encodeURIComponent(row.id)}`)} className="text-xs font-bold text-brand-500 underline underline-offset-2">Continuar rascunho</button> : null}</span>
                    </td>
                    <td className="px-5 py-4"><button type="button" role="switch" aria-checked={enabled} disabled={!toggleable} title={toggleable ? undefined : 'Disponível quando a campanha estiver aprovada e no período'} onClick={() => void toggleCampaign(row)} className={`relative h-6 w-11 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${enabled ? 'bg-brand-500' : 'bg-slate-200'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${enabled ? 'left-6' : 'left-1'}`} /></button></td>
                    <td className="px-5 py-4"><Badge tone={status.tone} className="normal-case tracking-normal">{status.label}</Badge></td>
                    <td className="px-5 py-4 text-slate-400">{formatDate(row.startsAt)}</td><td className="px-5 py-4 text-slate-400">{formatDate(row.endsAt)}</td>
                    <td className="px-5 py-4 font-semibold">{formatNumber(row.impressions)}</td><td className="px-5 py-4 font-semibold">{formatNumber(row.clicks)}</td><td className="px-5 py-4 text-slate-400">{formatNumber(row.conversions)}</td>
                    <td className="px-5 py-4 font-semibold">{formatUsd(row.spendCents)}</td><td className="px-5 py-4 font-semibold text-brand-500">{formatPercent(row.ctr)}</td><td className="px-5 py-4 text-slate-400">{row.cpcCents == null ? '-' : formatUsdWithCents(row.cpcCents)}</td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1">
                        {isDraft && canEdit ? <Button size="sm" iconOnly variant="ghost" aria-label="Continuar rascunho" title="Continuar rascunho" iconLeft={<Pencil size={15} />} className="text-slate-500" onClick={() => router.push(`/ads/wizard?draft=${encodeURIComponent(row.id)}`)} /> : null}
                        {canEdit && account?.businessId ? <Button size="sm" iconOnly variant="ghost" aria-label="Duplicar campanha" title="Duplicar como novo rascunho" iconLeft={<Copy size={15} />} className="text-slate-500" disabled={busyId === row.id} onClick={() => void duplicateCampaign(row)} /> : null}
                        {isDraft && canEdit ? <Button size="sm" iconOnly variant="ghost" aria-label="Descartar rascunho" title="Descartar rascunho" iconLeft={<Trash2 size={15} />} className="text-slate-500 hover:text-red-600" onClick={() => setDiscarding(row)} /> : canRemove(row) ? <Button size="sm" iconOnly variant="ghost" aria-label="Remover campanha" title="Remover do painel" iconLeft={<Trash2 size={15} />} className="text-slate-500 hover:text-red-600" onClick={() => setRemoving(row)} /> : null}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 ? (
                <tr><td colSpan={12} className="px-5 py-12 text-center text-sm text-slate-400">
                  {data.rows.length === 0 ? 'Você ainda não tem campanhas. Use o botão + para criar a primeira.' : 'Nenhuma campanha encontrada com esses filtros.'}
                  {data.rows.length > 0 ? <button type="button" onClick={clearFilters} className="ml-2 font-bold text-brand-500 underline underline-offset-2">Limpar filtros</button> : null}
                </td></tr>
              ) : null}
            </tbody>
            <tfoot><tr className="bg-slate-50/70 text-[13px] font-extrabold text-[#132f40]">
              <td className="px-5 py-4" colSpan={5}>Total{visibleRows.length !== data.rows.length ? ` (${visibleRows.length} de ${data.rows.length})` : ''}</td><td className="px-5 py-4">{formatNumber(totals.impressions)}</td><td className="px-5 py-4">{formatNumber(totals.clicks)}</td><td className="px-5 py-4">{formatNumber(totals.conversions)}</td><td className="px-5 py-4">{formatUsd(totals.spendCents)}</td><td className="px-5 py-4 text-brand-500">{formatPercent(totals.impressions ? totals.clicks / totals.impressions : 0)}</td><td className="px-5 py-4">{totals.clicks ? formatUsdWithCents(Math.round(totals.spendCents / totals.clicks)) : '-'}</td><td />
            </tr></tfoot>
          </table>
        </div>
      </Card>

      <ConfirmModal
        open={Boolean(discarding)}
        onClose={() => (removeBusy ? undefined : setDiscarding(null))}
        title="Descartar rascunho"
        description={`“${discarding?.label ?? ''}” será apagado do painel e não será restaurado ao criar uma nova campanha. Nenhuma cobrança é feita.`}
        confirmLabel="Descartar"
        cancelLabel="Manter rascunho"
        destructive
        loading={removeBusy}
        onConfirm={() => void discardDraft()}
      />
      <ConfirmModal
        open={Boolean(removing)}
        onClose={() => (removeBusy ? undefined : setRemoving(null))}
        title="Remover campanha"
        description={`“${removing?.label ?? ''}” deixa de aparecer no painel. O histórico de pagamentos e os relatórios são mantidos.`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        destructive
        loading={removeBusy}
        onConfirm={() => void removeCampaign()}
      />
      <Modal
        open={Boolean(revising && revisionForm)}
        onClose={() => { if (!resubmitting) { setRevising(null); setRevisionForm(null); } }}
        title="Corrigir anuncio rejeitado"
        description={revising?.rejectionReason ? `Motivo da rejeicao: ${revising.rejectionReason}` : 'Ajuste o criativo e envie novamente. Nao havera uma nova cobranca.'}
        className="max-w-2xl"
        footer={<><Button variant="secondary" disabled={resubmitting} onClick={() => { setRevising(null); setRevisionForm(null); }}>Cancelar</Button><Button loading={resubmitting} disabled={!revisionForm?.headline.trim() || !revisionForm?.description.trim() || !revisionForm?.imageUrl || !revisionForm?.destination.trim()} onClick={() => void resubmit()}>Reenviar para analise</Button></>}
      >
        {revisionForm ? <div className="max-h-[65dvh] space-y-4 overflow-y-auto pr-1">
          <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Titulo</label><Input value={revisionForm.headline} maxLength={70} onChange={(event) => setRevisionForm((current) => current ? { ...current, headline: event.target.value } : current)} /></div>
          <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Descricao</label><Textarea value={revisionForm.description} maxLength={600} onChange={(event) => setRevisionForm((current) => current ? { ...current, description: event.target.value } : current)} /></div>
          <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Imagem</label><CloudinaryImageField value={revisionForm.imageUrl} onChange={(imageUrl) => setRevisionForm((current) => current ? { ...current, imageUrl } : current)} folder="banners" cropAspect={4 / 3} height={200} /></div>
          <div><label className="mb-1.5 block text-xs font-bold text-slate-600">CTA</label><Input value={revisionForm.ctaLabel} maxLength={40} onChange={(event) => setRevisionForm((current) => current ? { ...current, ctaLabel: event.target.value } : current)} /></div>
          <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Destino</label><Input value={revisionForm.destination} maxLength={500} onChange={(event) => setRevisionForm((current) => current ? { ...current, destination: event.target.value } : current)} /></div>
        </div> : null}
      </Modal>
    </div>
  );
}
