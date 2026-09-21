'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Flag, RefreshCcw, XCircle } from 'lucide-react';
import { useToast } from '@/components/feedback/ToastProvider';
import { Avatar, Button } from '@/components/ui';

type Report = { id: string; reason: string; status: 'PENDING' | 'RESOLVED' | 'DISMISSED'; createdAt: string; group: { name: string; slug: string }; reporter: { name: string | null; username: string | null; email: string | null; image: string | null }; reviewedBy?: { name: string | null } | null };
const reasons: Record<string, string> = { MISINFORMATION: 'Disseminação de informações falsas', VIOLENCE: 'Organização ou incentivo à violência', HATE_SPEECH: 'Grupo de ódio ou discurso de ódio', ILLEGAL_GOODS_SERVICES: 'Produtos ou serviços ilegais', SEXUALLY_EXPLICIT: 'Conteúdo sexualmente explícito', UNMODERATED: 'Administração não está moderando', IMPERSONATION: 'Falsidade ideológica' };

export default function GroupReportsSection() {
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); try { const response = await fetch('/api/admin/group-reports', { cache: 'no-store' }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error || 'Não foi possível carregar as denúncias.'); setReports(payload.reports || []); } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível carregar as denúncias.', 'error'); } finally { setLoading(false); } }, [showToast]);
  useEffect(() => { void load(); }, [load]);
  const review = async (id: string, status: 'RESOLVED' | 'DISMISSED') => { setUpdating(id); try { const response = await fetch(`/api/admin/group-reports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error || 'Não foi possível revisar a denúncia.'); await load(); showToast('Denúncia atualizada.', 'success'); } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível revisar a denúncia.', 'error'); } finally { setUpdating(null); } };

  return <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Flag size={19} className="text-brand-500" /> Denúncias de grupos</h2><p className="mt-1 text-sm text-slate-500">Identifique o grupo, quem denunciou e o motivo informado.</p></div><button type="button" onClick={() => void load()} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Atualizar denúncias"><RefreshCcw size={17} /></button></div>
    {loading ? <p className="py-8 text-sm text-slate-500">Carregando denúncias...</p> : reports.length === 0 ? <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Nenhuma denúncia de grupo registrada.</div> : <div className="mt-5 divide-y divide-slate-100">{reports.map((report) => <article key={report.id} className="grid gap-4 py-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center"><div><Link href={`/grupos/${report.group.slug}`} className="font-bold text-slate-900 hover:text-brand-600">{report.group.name}</Link><p className="mt-1 text-sm font-semibold text-red-700">{reasons[report.reason] || report.reason}</p><p className="mt-1 text-xs text-slate-400">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.createdAt))}</p></div><div className="flex items-center gap-3"><Avatar src={report.reporter.image} name={report.reporter.name || report.reporter.email || 'Usuário'} size="sm" /><div className="min-w-0"><p className="truncate text-sm font-bold">{report.reporter.name || 'Usuário'}</p><p className="truncate text-xs text-slate-500">{report.reporter.email || `@${report.reporter.username || 'perfil'}`}</p></div></div><div className="flex flex-wrap gap-2">{report.status === 'PENDING' ? <><Button size="sm" loading={updating === report.id} iconLeft={<CheckCircle2 size={15} />} onClick={() => void review(report.id, 'RESOLVED')}>Resolver</Button><Button variant="secondary" size="sm" disabled={updating === report.id} iconLeft={<XCircle size={15} />} onClick={() => void review(report.id, 'DISMISSED')}>Descartar</Button></> : <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${report.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{report.status === 'RESOLVED' ? 'Resolvida' : 'Descartada'}</span>}</div></article>)}</div>}
  </section>;
}
