'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/feedback/ToastProvider';
import { cn } from '@/lib/cn';

type Policy = 'EVERYONE' | 'FRIENDS' | 'NOBODY';

const OPTIONS: Array<{ value: Policy; title: string; description: string }> = [
  { value: 'EVERYONE', title: 'Todos os membros', description: 'Qualquer pessoa da comunidade pode iniciar uma conversa.' },
  { value: 'FRIENDS', title: 'Só quem eu conecto', description: 'Os outros enviam uma solicitação nos Alertas, que você aceita, exclui ou bloqueia.' },
  { value: 'NOBODY', title: 'Ninguém', description: 'Ninguém inicia conversa nova. As conversas que você já tem continuam.' },
];

/** Quem pode me enviar mensagem direta. Negócios e organizadores de evento continuam recebendo contatos. */
export function MessagePrivacySection() {
  const { showToast } = useToast();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    void fetch('/api/me/message-policy', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!ignore && payload?.messagePolicy) setPolicy(payload.messagePolicy as Policy);
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, []);

  const choose = async (next: Policy) => {
    if (saving || next === policy) return;
    const previous = policy;
    setPolicy(next);
    setSaving(true);
    try {
      const response = await fetch('/api/me/message-policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messagePolicy: next }),
      });
      if (!response.ok) throw new Error();
      showToast('Preferência de mensagens salva.', 'success');
    } catch {
      setPolicy(previous);
      showToast('Não foi possível salvar agora. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm" aria-labelledby="message-privacy-title">
      <h2 id="message-privacy-title" className="text-xl font-bold text-brand-600">Quem pode me enviar mensagens</h2>
      <div className="mt-4 space-y-2" role="radiogroup" aria-labelledby="message-privacy-title">
        {OPTIONS.map((option) => {
          const selected = policy === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={saving || policy === null}
              onClick={() => void choose(option.value)}
              className={cn(
                'flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition disabled:opacity-60',
                selected ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50',
              )}
            >
              <span
                className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', selected ? 'border-brand-500' : 'border-slate-300')}
                aria-hidden
              >
                {selected ? <span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{option.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default MessagePrivacySection;
