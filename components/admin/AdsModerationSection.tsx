'use client';

import { useAdPlans } from '@/hooks/useAdPlans';
import { InfoTip } from '@/components/ui/InfoTip';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CalendarDays, Check, CheckCircle2, Clock3, Eye, MapPin, Megaphone, RefreshCcw, Search, X, XCircle } from 'lucide-react';
import { Badge, Button, Card, Input, Modal, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/feedback/ToastProvider';
import { cn } from '@/lib/cn';

type Campaign = {
  id: string; headline: string | null; name: string; description: string | null; imageUrl: string;
  ctaLabel: string | null; targetUrl: string | null; whatsappNumber: string | null; marketplaceItemId: string | null;
  placement: string; goal: 'WHATSAPP' | 'EXTERNAL_URL' | 'MARKETPLACE' | null; plan: 'BRONZE' | 'SILVER' | 'GOLD' | null;
  durationMonths: number | null; contractAmountCents: number | null; moderationStatus: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  paymentStatus: string; submittedAt: string; updatedAt: string; rejectionReason: string | null;
  region: { key: string; label: string } | null;
  adAccount: { id: string; name: string; logoUrl: string | null; country: string; currency: string; businessCategory: string | null } | null;
  createdBy: { name: string; email: string | null } | null;
  payments: Array<{ provider: string; providerPaymentId: string | null; amountCents: number; currency: string; status: string; paidAt: string | null; createdAt: string }>;
};
type Payload = { campaigns: Campaign[]; pagination: { page: number; pages: number; total: number }; stats: { pending: number; approved: number; rejected: number } };

const statusLabels = { PENDING_REVIEW: 'Pendentes', APPROVED: 'Aprovados', REJECTED: 'Rejeitados' } as const;
const quickReasons = ['Imagem inadequada ou ilegivel', 'Texto enganoso', 'Destino incompativel', 'Conteudo proibido', 'Informacoes insuficientes', 'Violacao das diretrizes'];
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const goalName = { WHATSAPP: 'WhatsApp', EXTERNAL_URL: 'URL externa', MARKETPLACE: 'Marketplace' } as const;

function slaStatus(submittedAt: string) {
  const remaining = new Date(submittedAt).getTime() + 86_400_000 - Date.now();
  if (remaining <= 0) return { label: 'SLA vencido', tone: 'erro' as const, overdue: true };
  const hours = Math.max(1, Math.ceil(remaining / 3_600_000));
  return { label: hours <= 4 ? `SLA ${hours}h` : 'SLA OK', tone: hours <= 4 ? 'destaque' as const : 'success' as const, overdue: false };
}

const destination = (campaign: Campaign) => campaign.goal === 'WHATSAPP' ? campaign.whatsappNumber : campaign.goal === 'MARKETPLACE' ? campaign.marketplaceItemId : campaign.targetUrl;

function DetailRows({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4">{rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 py-2.5 text-xs"><span className="text-slate-400">{label}</span><strong className="max-w-[62%] break-words text-right text-[#132F40]">{value || '-'}</strong></div>)}</div>;
}

export default function AdsModerationSection() {
  const adPlans = useAdPlans();
  const planName = new Proxy(Object.fromEntries((adPlans ?? []).map((item) => [item.plan, item.name])) as Record<string, string>, { get: (target, key) => target[key as string] ?? 'Pacote' });
  const { showToast } = useToast();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [status, setStatus] = useState<keyof typeof statusLabels>('PENDING_REVIEW');
  const [plan, setPlan] = useState('');
  const [region, setRegion] = useState('');
  const [goal, setGoal] = useState('');
  const [sort, setSort] = useState('oldest');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [approving, setApproving] = useState<Campaign | null>(null);
  const [rejecting, setRejecting] = useState<Campaign | null>(null);
  const [reason, setReason] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams({ status, page: String(page), sort });
    if (plan) params.set('plan', plan); if (region) params.set('region', region); if (goal) params.set('goal', goal); if (search.trim()) params.set('search', search.trim());
    return params.toString();
  }, [goal, page, plan, region, search, sort, status]);

  const loadCampaigns = useCallback(async (background = false) => {
    background ? setRefreshing(true) : setLoading(true);
    try {
      const response = await fetch(`/api/admin/ads?${query}`, { cache: 'no-store' });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? 'Nao foi possivel carregar a fila de anuncios.');
      setPayload(result);
      setSelected((current) => current ? result.campaigns.find((campaign: Campaign) => campaign.id === current.id) ?? current : null);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Falha ao carregar a fila.', 'error'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [query, showToast]);

  useEffect(() => { const timeout = window.setTimeout(() => void loadCampaigns(), search ? 250 : 0); return () => window.clearTimeout(timeout); }, [loadCampaigns, search]);

  const [reconciling, setReconciling] = useState(false);
  const reconcilePayments = async () => {
    setReconciling(true);
    try {
      const response = await fetch('/api/admin/ads/reconcile', { method: 'POST' });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? 'Nao foi possivel verificar os pagamentos.');
      const notMoved = (result.results as Array<{ headline: string | null; state: string; detail: string }>).filter((item) => item.state !== 'paid');
      showToast(result.checked === 0 ? 'Nenhuma campanha aguardando confirmacao de pagamento.' : result.moved + ' de ' + result.checked + ' campanha(s) enviadas para revisao.' + (notMoved.length ? ' Pendentes: ' + notMoved.map((item) => (item.headline || 'Campanha') + ' (' + item.detail + ')').join('; ') : ''), result.moved > 0 || result.checked === 0 ? 'success' : 'error');
      await loadCampaigns(true);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Falha ao verificar pagamentos.', 'error'); }
    finally { setReconciling(false); }
  };

  const approve = async () => {
    if (!approving) return; setProcessingId(approving.id);
    try {
      const response = await fetch(`/api/admin/ads/${approving.id}/approve`, { method: 'POST' }); const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? 'Nao foi possivel aprovar a campanha.');
      setApproving(null); setSelected(null); showToast('Campanha aprovada e anunciante notificado.', 'success'); await loadCampaigns(true);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Falha ao aprovar.', 'error'); }
    finally { setProcessingId(null); }
  };
  const reject = async () => {
    if (!rejecting || reason.trim().length < 5) return; setProcessingId(rejecting.id);
    try {
      const response = await fetch(`/api/admin/ads/${rejecting.id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: reason.trim() }) }); const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? 'Nao foi possivel rejeitar a campanha.');
      setRejecting(null); setSelected(null); setReason(''); showToast('Campanha rejeitada e anunciante notificado.', 'success'); await loadCampaigns(true);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Falha ao rejeitar.', 'error'); }
    finally { setProcessingId(null); }
  };
  const resetFilters = () => { setPlan(''); setRegion(''); setGoal(''); setSort('oldest'); setSearch(''); setPage(1); };
  const regions = Array.from(new Map((payload?.campaigns ?? []).filter((item) => item.region).map((item) => [item.region!.key, item.region!])).values());
  const overdue = status === 'PENDING_REVIEW' ? payload?.campaigns.filter((item) => slaStatus(item.submittedAt).overdue).length ?? 0 : 0;
  const stats = [
    { label: 'Aguardando revisao', value: payload?.stats.pending ?? 0, caption: 'Prazo: 24h', icon: Clock3, color: 'bg-amber-100 text-amber-600' },
    { label: 'SLA vencido', value: overdue, caption: overdue ? 'Requer atencao imediata' : 'Nenhuma pendencia', icon: XCircle, color: 'bg-red-100 text-red-600' },
    { label: 'Aprovados', value: payload?.stats.approved ?? 0, caption: 'Campanhas liberadas', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Rejeitados', value: payload?.stats.rejected ?? 0, caption: 'Historico de revisao', icon: XCircle, color: 'bg-red-50 text-red-500' },
  ];

  return (
    <div className={cn('transition-[padding] duration-200', selected && 'xl:pr-[400px]')}>
      <div className="mx-auto max-w-[1180px] space-y-6 px-4 py-7 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><h1 className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-[#132F40] sm:text-[28px]">Anúncios pagos<InfoTip text="Revise as campanhas pagas antes de publicá-las." /></h1><button type="button" aria-label="Atualizar" title="Atualizar" disabled={refreshing} onClick={() => void loadCampaigns(true)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"><RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} /></button></div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((item) => { const Icon = item.icon; return <Card key={item.label} className="rounded-2xl border border-slate-200 p-5 shadow-[0_2px_12px_rgba(15,23,42,.035)]"><span className={`flex h-10 w-10 items-center justify-center rounded-full ${item.color}`}><Icon size={19} /></span><p className="mt-5 text-3xl font-extrabold">{item.value}</p><p className="mt-1 text-xs font-bold">{item.label}</p><p className="mt-1 text-[11px] text-slate-400">{item.caption}</p></Card>; })}</div>

        <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">Pagou e a campanha nao apareceu? Confirme direto no Stripe.</span><Button variant="secondary" size="sm" loading={reconciling} onClick={() => void reconcilePayments()}>Verificar pagamentos pendentes</Button></div>

        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">{(Object.keys(statusLabels) as Array<keyof typeof statusLabels>).map((item) => <button key={item} type="button" onClick={() => { setStatus(item); setPage(1); setSelected(null); }} className={cn('rounded-full px-5 py-2 text-sm font-bold transition', status === item ? 'bg-[#EAF1FF] text-[#2B5DF5]' : 'text-slate-400 hover:text-slate-700')}>{statusLabels[item]} <span className="ml-1">{item === 'PENDING_REVIEW' ? payload?.stats.pending : item === 'APPROVED' ? payload?.stats.approved : payload?.stats.rejected}</span></button>)}</div>

        <div className="flex flex-col gap-2 lg:flex-row"><div className="min-w-0 flex-1"><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar por anuncio, empresa ou e-mail..." prefixIcon={<Search size={16} />} /></div><Select value={plan} onChange={(event) => { setPlan(event.target.value); setPage(1); }}><option value="">Plano</option><option value="BRONZE">Bronze</option><option value="SILVER">Prata</option><option value="GOLD">Ouro</option></Select><Select value={region} onChange={(event) => { setRegion(event.target.value); setPage(1); }}><option value="">Regiao</option>{regions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</Select><Select value={goal} onChange={(event) => { setGoal(event.target.value); setPage(1); }}><option value="">Objetivo</option><option value="WHATSAPP">WhatsApp</option><option value="EXTERNAL_URL">URL externa</option><option value="MARKETPLACE">Marketplace</option></Select><Select value={sort} onChange={(event) => setSort(event.target.value)}><option value="oldest">Mais antigos</option><option value="newest">Mais recentes</option><option value="sla">SLA proximo</option></Select><button type="button" onClick={resetFilters} className="whitespace-nowrap px-3 text-xs font-bold text-slate-400 hover:text-slate-700">× Limpar</button></div>

        {loading && !payload ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-white" />)}</div> : null}
        <div className="space-y-3">{payload?.campaigns.map((campaign) => { const sla = slaStatus(campaign.submittedAt); return <Card key={campaign.id} className="rounded-2xl border border-slate-200 p-4 shadow-none transition hover:border-blue-200"><div className="flex gap-4"><img src={campaign.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-2xl bg-slate-100 object-cover sm:h-20 sm:w-20" /><div className="min-w-0 flex-1"><div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between"><div><h3 className="truncate text-sm font-extrabold text-[#132F40]">{campaign.headline || campaign.name}</h3><p className="mt-0.5 text-[10px] font-medium text-slate-400">#{campaign.id.slice(-8).toUpperCase()}</p></div><div className="flex flex-wrap gap-1.5"><Badge tone={campaign.moderationStatus === 'APPROVED' ? 'success' : campaign.moderationStatus === 'REJECTED' ? 'erro' : 'destaque'} className="normal-case tracking-normal">{campaign.moderationStatus === 'PENDING_REVIEW' ? 'Aguardando revisao' : campaign.moderationStatus === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}</Badge>{campaign.moderationStatus === 'PENDING_REVIEW' ? <Badge tone={sla.tone} className="normal-case tracking-normal">{sla.label}</Badge> : null}</div></div><div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400"><span className="flex items-center gap-1"><Building2 size={12} />{campaign.adAccount?.name ?? '-'}</span><span className="flex items-center gap-1"><MapPin size={12} />{campaign.region?.label ?? '-'}</span><span className="flex items-center gap-1"><CalendarDays size={12} />{campaign.durationMonths ?? '-'} mes(es)</span><span>{campaign.goal ? goalName[campaign.goal] : '-'}</span></div><div className="mt-2 flex flex-wrap items-center gap-2"><Badge tone="neutro" className="normal-case tracking-normal">{campaign.plan ? planName[campaign.plan] : 'Sem plano'}</Badge><Badge tone="success" className="normal-case tracking-normal">Pagamento confirmado</Badge><strong className="text-xs">{campaign.contractAmountCents == null ? '-' : usd.format(campaign.contractAmountCents / 100)}</strong><span className="ml-auto text-[10px] text-slate-400">{dateTime.format(new Date(campaign.submittedAt))}</span></div></div></div><div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3"><Button size="xs" variant="ghost" iconLeft={<Eye size={14} />} className="border border-slate-200" onClick={() => setSelected(campaign)}>Ver detalhes</Button>{campaign.moderationStatus === 'PENDING_REVIEW' ? <><Button size="xs" variant="success" iconLeft={<Check size={14} />} onClick={() => setApproving(campaign)}>Aprovar</Button><Button size="xs" variant="secondary" iconLeft={<X size={14} />} className="border-red-400 text-red-600" onClick={() => { setRejecting(campaign); setReason(''); }}>Rejeitar</Button></> : null}</div></Card>; })}</div>

        {!loading && payload?.campaigns.length === 0 ? <Card className="rounded-2xl border border-slate-200 py-14 text-center shadow-none"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 /></span><h3 className="mt-4 font-extrabold">Fila em dia</h3><p className="mt-1 text-sm text-slate-400">Nenhuma campanha esta aguardando revisao.</p></Card> : null}
        {payload && payload.pagination.pages > 1 ? <div className="flex items-center justify-between"><Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Anterior</Button><span className="text-xs font-semibold text-slate-500">Pagina {page} de {payload.pagination.pages}</span><Button variant="secondary" size="sm" disabled={page >= payload.pagination.pages || loading} onClick={() => setPage((value) => value + 1)}>Proxima</Button></div> : null}
      </div>

      {selected ? <><button type="button" aria-label="Fechar detalhes" className="fixed inset-0 z-[55] bg-slate-950/25 xl:hidden" onClick={() => setSelected(null)} /><aside className="fixed bottom-0 right-0 top-[74px] z-[60] w-full overflow-y-auto border-l border-slate-200 bg-white shadow-2xl sm:w-[400px]"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><div><h2 className="text-sm font-extrabold">Detalhes da Campanha</h2><p className="text-[10px] text-slate-400">#{selected.id.slice(-8).toUpperCase()} · {selected.adAccount?.name}</p></div><button type="button" className="rounded-full bg-slate-50 p-2 text-slate-400" onClick={() => setSelected(null)}><X size={17} /></button></div><div className="space-y-5 p-5 pb-32"><section><p className="mb-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Preview do anuncio</p><div className="overflow-hidden rounded-2xl border border-slate-200"><img src={selected.imageUrl} alt="" className="aspect-[16/8] w-full object-cover" /><div className="p-4"><p className="text-xs font-bold">{selected.adAccount?.name}</p><p className="mt-2 text-sm font-extrabold">{selected.headline || selected.name}</p><p className="mt-1 text-xs leading-5 text-slate-400">{selected.description}</p><div className="mt-3 rounded-full bg-[#0787F9] py-2 text-center text-xs font-bold text-white">{selected.ctaLabel || 'Saiba mais'}</div></div></div></section><section><p className="mb-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Criativo</p><DetailRows rows={[["Headline", selected.headline || selected.name], ["Objetivo", selected.goal ? goalName[selected.goal] : '-'], ["CTA", selected.ctaLabel], ["Destino", destination(selected)]]} /></section><section><p className="mb-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Segmentacao</p><DetailRows rows={[["Regiao", selected.region?.label], ["Pais", selected.adAccount?.country], ["Placement", selected.placement === 'BOTH' ? 'Home + Feed' : selected.placement]]} /></section><section><p className="mb-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Contrato</p><DetailRows rows={[["Plano", selected.plan ? planName[selected.plan] : '-'], ["Duracao", `${selected.durationMonths ?? '-'} mes(es)`], ["Valor", selected.contractAmountCents == null ? '-' : usd.format(selected.contractAmountCents / 100)], ["Inicio", 'Apos aprovacao'], ["Termino", `+${selected.durationMonths ?? '-'} meses do inicio`]]} /></section><section><p className="mb-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Pagamento</p><DetailRows rows={[["Status", 'Pagamento confirmado'], ["Provedor", selected.payments[0]?.provider], ["Valor", selected.payments[0] ? usd.format(selected.payments[0].amountCents / 100) : '-'], ["Moeda", selected.payments[0]?.currency], ["Tx ID", selected.payments[0]?.providerPaymentId ? `${selected.payments[0].providerPaymentId.slice(0, 7)}...${selected.payments[0].providerPaymentId.slice(-4)}` : '-'], ["Data", selected.payments[0]?.paidAt ? dateTime.format(new Date(selected.payments[0].paidAt)) : '-']]} /></section><section><p className="mb-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Anunciante</p><DetailRows rows={[["Empresa", selected.adAccount?.name], ["Responsavel", selected.createdBy?.name], ["E-mail", selected.createdBy?.email], ["Account ID", selected.adAccount?.id]]} /></section></div>{selected.moderationStatus === 'PENDING_REVIEW' ? <div className="fixed bottom-0 right-0 z-20 w-full space-y-2 border-t border-slate-200 bg-white p-5 sm:w-[400px]"><Button fullWidth variant="success" onClick={() => setApproving(selected)}>Aprovar Campanha</Button><Button fullWidth variant="secondary" className="border-red-400 text-red-600" onClick={() => { setRejecting(selected); setReason(''); }}>Rejeitar com Motivo</Button></div> : null}</aside></> : null}

      <Modal open={Boolean(approving)} onClose={() => { if (!processingId) setApproving(null); }} className="max-w-lg" footer={<><Button variant="secondary" fullWidth disabled={Boolean(processingId)} onClick={() => setApproving(null)}>Cancelar</Button><Button variant="success" fullWidth loading={processingId === approving?.id} onClick={() => void approve()}>Aprovar campanha</Button></>}><div className="flex gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={22} /></span><div><h2 className="text-lg font-extrabold">Aprovar campanha?</h2><p className="text-sm text-slate-400">A campanha sera ativada imediatamente.</p></div></div>{approving ? <div className="mt-5"><DetailRows rows={[["Campanha", approving.headline || approving.name], ["Empresa", approving.adAccount?.name], ["Plano", `${approving.plan ? planName[approving.plan] : '-'} — ${approving.durationMonths ?? '-'} meses`], ["Vigencia", `Aprovacao → +${approving.durationMonths ?? '-'} meses`], ["Valor", approving.contractAmountCents == null ? '-' : usd.format(approving.contractAmountCents / 100)]]} /><p className="mt-5 text-xs leading-5 text-slate-400">A campanha podera aparecer na Home e no feed da comunidade durante a vigencia contratada.</p></div> : null}</Modal>

      <Modal open={Boolean(rejecting)} onClose={() => { if (!processingId) setRejecting(null); }} className="max-w-lg" footer={<><Button variant="secondary" fullWidth disabled={Boolean(processingId)} onClick={() => setRejecting(null)}>Cancelar</Button><Button variant="destructive" fullWidth loading={processingId === rejecting?.id} disabled={reason.trim().length < 5} onClick={() => void reject()}>Confirmar rejeicao</Button></>}><div className="flex gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"><XCircle size={22} /></span><div><h2 className="text-lg font-extrabold">Rejeitar campanha</h2><p className="text-xs text-slate-400">#{rejecting?.id.slice(-8).toUpperCase()} · {rejecting?.adAccount?.name}</p></div></div><p className="mt-5 text-sm leading-6 text-slate-500">Informe um motivo claro para que o anunciante possa corrigir o criativo e reenviar sem nova cobranca.</p><p className="mt-4 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Sugestoes rapidas</p><div className="mt-2 flex flex-wrap gap-2">{quickReasons.map((item) => <button key={item} type="button" onClick={() => setReason(item)} className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:border-blue-300 hover:bg-blue-50">{item}</button>)}</div><label className="mt-5 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Motivo da rejeicao <span className="text-red-500">*</span></label><Textarea className="mt-2 min-h-28 border-[#2B5DF5]" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} placeholder="Descreva o problema encontrado no criativo..." helperText={`Min. 5 · max. 1000 caracteres. ${reason.length}/1000`} /></Modal>
    </div>
  );
}
