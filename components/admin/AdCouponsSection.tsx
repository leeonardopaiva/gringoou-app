'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, RefreshCcw, Trash2 } from 'lucide-react';
import { useToast } from '@/components/feedback/ToastProvider';
import { Skeleton } from '@/components/ui';
import { InfoTip } from '@/components/ui/InfoTip';
import { EmptyNotice } from '@/components/ui/EmptyNotice';

type Coupon = {
  id: string;
  code: string;
  plan: 'BRONZE' | 'SILVER' | 'GOLD' | null;
  assignedEmail: string | null;
  maxRedemptions: number;
  redeemedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  note: string | null;
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400';
const randomCode = () => `CORTESIA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

/** Cupons de cortesia (somente administrador raiz): liberam uma campanha sem cobrança; depois o cliente contrata normalmente. */
export default function AdCouponsSection() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: randomCode(), plan: '', assignedEmail: '', maxRedemptions: '1', expiresAt: '', note: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ads/coupons', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível carregar os cupons.');
      setCoupons(payload.coupons);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível carregar os cupons.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/admin/ads/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          plan: form.plan || null,
          assignedEmail: form.assignedEmail || null,
          maxRedemptions: Number(form.maxRedemptions) || 1,
          expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
          note: form.note || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível criar o cupom.');
      showToast(`Cupom ${payload.coupon.code} criado.`, 'success');
      setForm({ code: randomCode(), plan: '', assignedEmail: '', maxRedemptions: '1', expiresAt: '', note: '' });
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível criar o cupom.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (coupon: Coupon) => {
    const response = await fetch(`/api/admin/ads/coupons/${coupon.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !coupon.isActive }) });
    if (!response.ok) return showToast('Não foi possível atualizar o cupom.', 'error');
    await load();
  };

  const remove = async (coupon: Coupon) => {
    const response = await fetch(`/api/admin/ads/coupons/${coupon.id}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return showToast(payload?.error || 'Não foi possível excluir o cupom.', 'error');
    await load();
  };

  const copy = (code: string) => {
    void navigator.clipboard.writeText(code).then(() => showToast('Código copiado.', 'success')).catch(() => showToast(code, 'info', 5000));
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-7 sm:px-7 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-[#132F40] sm:text-[28px]">
          Cupons de cortesia
          <InfoTip text="Cada cupom libera uma campanha sem cobrança e vale uma vez por conta de anúncios. Depois da cortesia, o cliente contrata o pacote pelo fluxo normal de promover." />
        </h1>
        <button type="button" aria-label="Atualizar" title="Atualizar" onClick={() => void load()} disabled={loading} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-50">
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-900">Novo cupom</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-xs font-bold text-slate-500">Código
            <div className="mt-1 flex gap-2"><input className={inputClass} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} /><button type="button" onClick={() => setForm({ ...form, code: randomCode() })} className="shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50">Gerar</button></div>
          </label>
          <label className="block text-xs font-bold text-slate-500">Pacote
            <select className={`${inputClass} mt-1`} value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value })}>
              <option value="">Qualquer pacote</option><option value="BRONZE">Bronze</option><option value="SILVER">Prata</option><option value="GOLD">Ouro</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-500">E-mail do cliente (opcional)<input type="email" className={`${inputClass} mt-1`} placeholder="só esta pessoa pode usar" value={form.assignedEmail} onChange={(event) => setForm({ ...form, assignedEmail: event.target.value })} /></label>
          <label className="block text-xs font-bold text-slate-500">Limite de usos<input inputMode="numeric" className={`${inputClass} mt-1`} value={form.maxRedemptions} onChange={(event) => setForm({ ...form, maxRedemptions: event.target.value })} /></label>
          <label className="block text-xs font-bold text-slate-500">Validade (opcional)<input type="date" className={`${inputClass} mt-1`} value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} /></label>
          <label className="block text-xs font-bold text-slate-500">Anotação interna<input className={`${inputClass} mt-1`} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
        </div>
        <button type="button" onClick={() => void create()} disabled={creating || form.code.length < 4} className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-60">{creating ? 'Criando...' : 'Criar cupom'}</button>
      </section>

      {loading && coupons.length === 0 ? (
        <Skeleton className="h-40 w-full" />
      ) : coupons.length === 0 ? (
        <EmptyNotice title="Nenhum cupom criado" description="Crie um cupom acima para indicar um cliente." />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {coupons.map((coupon) => {
            const expired = coupon.expiresAt ? new Date(coupon.expiresAt).getTime() < Date.now() : false;
            const exhausted = coupon.redeemedCount >= coupon.maxRedemptions;
            const status = !coupon.isActive ? ['Desativado', 'bg-slate-100 text-slate-500'] : expired ? ['Expirado', 'bg-amber-50 text-amber-700'] : exhausted ? ['Esgotado', 'bg-amber-50 text-amber-700'] : ['Ativo', 'bg-emerald-50 text-emerald-700'];
            return (
              <li key={coupon.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <span className="font-mono">{coupon.code}</span>
                    <button type="button" onClick={() => copy(coupon.code)} aria-label="Copiar código" className="text-slate-400 hover:text-slate-600"><Copy size={14} /></button>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {coupon.plan ?? 'Qualquer pacote'} · {coupon.redeemedCount}/{coupon.maxRedemptions} usos{coupon.assignedEmail ? ` · ${coupon.assignedEmail}` : ''}{coupon.expiresAt ? ` · até ${new Date(coupon.expiresAt).toLocaleDateString('pt-BR')}` : ''}{coupon.note ? ` · ${coupon.note}` : ''}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${status[1]}`}>{status[0]}</span>
                <button type="button" onClick={() => void toggle(coupon)} className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">{coupon.isActive ? 'Desativar' : 'Ativar'}</button>
                {coupon.redeemedCount === 0 ? <button type="button" onClick={() => void remove(coupon)} aria-label="Excluir cupom" className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
