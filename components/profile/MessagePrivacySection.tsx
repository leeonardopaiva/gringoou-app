'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/feedback/ToastProvider';
import { cn } from '@/lib/cn';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

type Policy = 'EVERYONE' | 'FRIENDS' | 'NOBODY';

const OPTIONS: Array<{ value: Policy; title: string; description: string }> = [
  { value: 'EVERYONE', title: 'Todos os membros', description: 'Qualquer pessoa da comunidade pode iniciar uma conversa.' },
  { value: 'FRIENDS', title: 'Só quem eu conecto', description: 'Os outros enviam uma solicitação nos Alertas, que você aceita, exclui ou bloqueia.' },
  { value: 'NOBODY', title: 'Ninguém', description: 'Ninguém inicia conversa nova. As conversas que você já tem continuam.' },
];

export type MessagePolicy = Policy;

/** Opções de privacidade de mensagens, controladas por quem usa (sem salvar sozinho). */
export function MessagePolicyOptions({ value, onChange, disabled }: { value: Policy | null; onChange: (next: Policy) => void; disabled?: boolean }) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Quem pode me enviar mensagens">
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled || value === null}
            onClick={() => onChange(option.value)}
            className={cn('flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition disabled:opacity-60', selected ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50')}
          >
            <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', selected ? 'border-brand-500' : 'border-slate-300')} aria-hidden>
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
  );
}

/**
 * Privacidade de mensagens em uma janela própria: abre sobre a tela atual (sem levar ao perfil),
 * carrega a escolha salva e grava ao clicar em Salvar. Negócios e organizadores de evento continuam recebendo contatos.
 */
export function MessagePrivacyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { showToast } = useToast();
  const [saved, setSaved] = useState<Policy | null>(null);
  const [draft, setDraft] = useState<Policy | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    void fetch('/api/me/message-policy', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (ignore || !payload?.messagePolicy) return;
        setSaved(payload.messagePolicy as Policy);
        setDraft(payload.messagePolicy as Policy);
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, [open]);

  const save = async () => {
    if (!draft || saving) return;
    if (draft === saved) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/me/message-policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messagePolicy: draft }),
      });
      if (!response.ok) throw new Error();
      setSaved(draft);
      showToast('Privacidade de mensagens atualizada.', 'success');
      onClose();
    } catch {
      showToast('Não foi possível salvar agora. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      title="Privacidade"
      description="Quem pode iniciar uma conversa com você."
      className="sm:max-w-md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="button" onClick={() => void save()} disabled={!draft || saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      }
    >
      <MessagePolicyOptions value={draft} onChange={setDraft} disabled={saving} />
    </Modal>
  );
}
