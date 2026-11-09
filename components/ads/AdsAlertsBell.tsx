'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Bell, CheckCircle2, Clock3, RotateCcw, XCircle } from 'lucide-react';
import { useAdAccount } from '@/components/ads/AdAccountProvider';
import { cn } from '@/lib/cn';

type AdAlert = { id: string; type: string; title: string; body: string | null; href: string | null; readAt: string | null; createdAt: string };

const ICONS: Record<string, { icon: React.ElementType; tone: string }> = {
  CAMPAIGN_APPROVED: { icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
  CAMPAIGN_REJECTED: { icon: XCircle, tone: 'bg-red-50 text-red-600' },
  CAMPAIGN_SUBMITTED: { icon: Clock3, tone: 'bg-amber-50 text-amber-600' },
  PAYMENT_CONFIRMED: { icon: CheckCircle2, tone: 'bg-sky-50 text-sky-600' },
  PAYMENT_FAILED: { icon: AlertCircle, tone: 'bg-red-50 text-red-600' },
  PAYMENT_REFUNDED: { icon: RotateCcw, tone: 'bg-slate-100 text-slate-600' },
};

function timeAgo(value: string) {
  const mins = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins} min`;
  if (mins < 1440) return `${Math.floor(mins / 60)} h`;
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/** Alertas do painel do negócio: mudanças de status de campanhas e pagamentos. */
export function AdsAlertsBell() {
  const router = useRouter();
  const { account } = useAdAccount();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdAlert[]>([]);
  const [unread, setUnread] = useState(0);
  const accountId = account?.id;

  const load = useCallback(async () => {
    if (!accountId) return;
    try {
      const response = await fetch(`/api/ads/notifications?adAccountId=${encodeURIComponent(accountId)}`, { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      setItems(payload.items ?? []);
      setUnread(payload.unread ?? 0);
    } catch {
      /* sem conexão: tenta de novo no próximo ciclo */
    }
  }, [accountId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const markRead = async (ids?: string[]) => {
    if (!accountId) return;
    setItems((current) => current.map((item) => (!ids || ids.includes(item.id) ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item)));
    setUnread((current) => (ids ? Math.max(0, current - ids.length) : 0));
    await fetch('/api/ads/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adAccountId: accountId, ...(ids ? { ids } : {}) }) }).catch(() => undefined);
  };

  return (
    <div ref={rootRef} className="relative">
      <button type="button" aria-label={unread ? `Alertas (${unread} novos)` : 'Alertas'} aria-expanded={open} onClick={() => { setOpen((value) => !value); if (!open) void load(); }} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
        <Bell size={18} />
        {unread ? <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[80] w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/10">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-900">Alertas</p>
            {unread ? <button type="button" onClick={() => void markRead()} className="text-xs font-semibold text-brand-600 hover:underline">Marcar todos como lidos</button> : null}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Bell size={20} /></span>
                <p className="text-sm font-semibold text-slate-700">Nenhum alerta por enquanto</p>
                <p className="text-xs text-slate-400">Avisamos aqui quando uma campanha for aprovada, recusada ou precisar da sua atenção.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => {
                  const visual = ICONS[item.type] ?? { icon: Bell, tone: 'bg-slate-100 text-slate-600' };
                  const Icon = visual.icon;
                  return (
                    <li key={item.id}>
                      <button type="button" onClick={() => { void markRead([item.id]); setOpen(false); if (item.href) router.push(item.href); }} className={cn('flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50', !item.readAt && 'bg-brand-50/40')}>
                        <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', visual.tone)}><Icon size={16} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-slate-900">{item.title}</strong><span className="shrink-0 text-[11px] text-slate-400">{timeAgo(item.createdAt)}</span></span>
                          {item.body ? <span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.body}</span> : null}
                        </span>
                        {!item.readAt ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Não lido" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
