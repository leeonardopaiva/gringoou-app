'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link2, RotateCcw, Save, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/components/feedback/ToastProvider';
import { Button } from '@/components/ui/Button';
import { EmptyNotice } from '@/components/ui/EmptyNotice';
import { Skeleton } from '@/components/ui';
import { buildUtmUrl, type UtmParams } from '@/lib/utm';

type RuleState = UtmParams & { enabled: boolean };

type Kind = {
  key: string;
  label: string;
  group: string;
  description: string;
  variables: string[];
  defaults: UtmParams;
  customized: boolean;
  rule: RuleState;
};

type Manager = { id: string; name: string | null; email: string | null; role: string };

const inputClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';
const SAMPLE_VARS = { id: 'cmw123abc', campanha: 'Promo Verão 2026', posicao: 'home', regiao: 'orlando-fl' };

const FIELDS: Array<{ id: 'source' | 'medium' | 'campaign' | 'content' | 'term'; label: string; param: string; required?: boolean }> = [
  { id: 'source', label: 'Origem', param: 'utm_source', required: true },
  { id: 'medium', label: 'Meio', param: 'utm_medium', required: true },
  { id: 'campaign', label: 'Campanha', param: 'utm_campaign', required: true },
  { id: 'content', label: 'Conteúdo', param: 'utm_content' },
  { id: 'term', label: 'Termo', param: 'utm_term' },
];

const RuleCard: React.FC<{ kind: Kind; onSaved: () => void }> = ({ kind, onSaved }) => {
  const { showToast } = useToast();
  const [draft, setDraft] = useState<RuleState>(kind.rule);
  const [busy, setBusy] = useState(false);

  useEffect(() => setDraft(kind.rule), [kind.rule]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(kind.rule);
  const preview = useMemo(
    () => buildUtmUrl(kind.key, 'https://gringoou.com/exemplo', SAMPLE_VARS, { [kind.key]: draft }),
    [kind.key, draft],
  );

  const save = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/utm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: kind.key, ...draft }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível salvar.');
      showToast('Regra de UTM salva.', 'success');
      onSaved();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/utm?key=${encodeURIComponent(kind.key)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Não foi possível restaurar.');
      showToast('Padrão restaurado.', 'success');
      onSaved();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível restaurar.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">{kind.label}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{kind.description}</p>
          <p className="mt-1 font-mono text-[11px] text-slate-400">{kind.key}{kind.customized ? ' · personalizado' : ' · padrão'}</p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 accent-brand-500"
          />
          Ativo
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((field) => (
          <label key={field.id} className="block text-xs font-semibold text-slate-600">
            {field.label} <span className="font-mono font-normal text-slate-400">{field.param}</span>
            <input
              value={draft[field.id] ?? ''}
              onChange={(event) => setDraft((current) => ({ ...current, [field.id]: event.target.value }))}
              required={field.required}
              maxLength={100}
              className={`${inputClass} mt-1`}
            />
          </label>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Variáveis: {kind.variables.map((variable) => (
          <code key={variable} className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{`{${variable}}`}</code>
        ))}
        Os valores finais são normalizados (minúsculas, sem acento, `_`).
      </p>

      <div className="mt-3 rounded-xl bg-slate-50 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Exemplo do link gerado</p>
        <p className="mt-1 break-all font-mono text-[11px] text-slate-700">{draft.enabled ? preview : 'Desativado: o link sai sem UTM.'}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" iconLeft={<Save size={14} />} loading={busy} disabled={!dirty || !draft.source.trim() || !draft.medium.trim() || !draft.campaign.trim()} onClick={() => void save()}>
          Salvar
        </Button>
        <Button size="sm" variant="ghost" iconLeft={<RotateCcw size={14} />} className="border border-slate-200 text-slate-700 hover:bg-slate-50" disabled={busy || !kind.customized} onClick={() => void reset()}>
          Restaurar padrão
        </Button>
      </div>
    </article>
  );
};

const ManagersCard: React.FC = () => {
  const { showToast } = useToast();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/utm/managers', { cache: 'no-store' });
    if (response.ok) setManagers((await response.json()).managers ?? []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const grant = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch('/api/admin/utm/managers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível conceder.');
      setEmail('');
      showToast('Permissão concedida.', 'success');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível conceder.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (userId: string) => {
    const response = await fetch(`/api/admin/utm/managers?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
    if (response.ok) {
      showToast('Permissão removida.', 'success');
      await load();
    } else {
      showToast('Não foi possível remover.', 'error');
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="text-sm font-bold text-slate-900">Quem pode gerenciar UTM</h2>
      <p className="mt-0.5 text-xs text-slate-500">Administradores sempre podem. Conceda a permissão a uma agência ou gestor de marketing pelo e-mail da conta dele.</p>
      <form onSubmit={grant} className="mt-3 flex flex-wrap gap-2">
        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@agencia.com" className={`${inputClass} min-w-0 flex-1`} />
        <Button type="submit" size="sm" iconLeft={<UserPlus size={14} />} loading={busy}>Conceder</Button>
      </form>
      {managers.length ? (
        <ul className="mt-3 divide-y divide-slate-100">
          {managers.map((manager) => (
            <li key={manager.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{manager.name ?? 'Sem nome'}</p>
                <p className="truncate text-xs text-slate-500">{manager.email}</p>
              </div>
              <button type="button" onClick={() => void revoke(manager.id)} aria-label={`Remover permissão de ${manager.name ?? manager.email}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-slate-400">Nenhuma permissão extra concedida.</p>
      )}
    </section>
  );
};

/** Gestão das regras de UTM (admin e usuários com a permissão "Gerenciar UTM"). A API confere o acesso no servidor. */
export default function UtmSection() {
  const [kinds, setKinds] = useState<Kind[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/utm', { cache: 'no-store' });
    if (response.status === 401 || response.status === 403) {
      setDenied(true);
      return;
    }
    if (!response.ok) return;
    const payload = await response.json();
    setIsAdmin(Boolean(payload.isAdmin));
    setKinds(payload.kinds as Kind[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (denied) return <EmptyNotice title="Acesso restrito" description="Você não tem permissão para gerenciar UTM. Peça a um administrador." />;
  if (!kinds) return <div className="mx-auto max-w-5xl space-y-3 p-5 sm:p-8"><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /></div>;

  const groups = Array.from(new Set(kinds.map((kind) => kind.group)));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Link2 size={20} className="text-brand-500" aria-hidden /> UTM e rastreabilidade</h1>
        <p className="mt-1 text-sm text-slate-600">
          Cada link compartilhado e cada CTA de campanha paga recebe parâmetros UTM automaticamente. Ajuste os valores abaixo para o seu analytics; a alteração vale em poucos minutos, sem novo deploy.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group} className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">{group}</h2>
          {kinds.filter((kind) => kind.group === group).map((kind) => (
            <RuleCard key={kind.key} kind={kind} onSaved={() => void load()} />
          ))}
        </section>
      ))}

      {isAdmin ? <ManagersCard /> : null}
    </div>
  );
}
