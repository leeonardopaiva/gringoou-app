'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import RegionSelector from '@/components/RegionSelector';
import { useToast } from '@/components/feedback/ToastProvider';

type GroupDraft = {
  name: string;
  category: string;
  description: string;
  regionKey: string;
  countryCode: string;
  isPublic: boolean;
};

const emptyDraft: GroupDraft = {
  name: '',
  category: '',
  description: '',
  regionKey: '',
  countryCode: 'US',
  isPublic: true,
};

export type CreatedGroup = { id: string; name: string; slug: string; publicPath: string };

type CreateGroupModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (group: CreatedGroup | null) => void;
};

export default function CreateGroupModal({ open, onClose, onCreated }: CreateGroupModalProps) {
  const { showToast } = useToast();
  const [draft, setDraft] = useState<GroupDraft>(emptyDraft);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel criar o grupo.');
      }

      showToast(payload?.message || 'Grupo criado.', 'success');
      setDraft(emptyDraft);
      onClose();
      onCreated(payload?.group ?? null);
    } catch (createError) {
      showToast(createError instanceof Error ? createError.message : 'Nao foi possivel criar o grupo.', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Criar grupo"
      description="Organize pessoas por cidade, bairro ou interesse."
    >
      <div className="space-y-3">
        <input
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          placeholder="Nome do grupo"
          className="theme-outline-ring w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        />
        <input
          value={draft.category}
          onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
          placeholder="Categoria, ex: Bairro, Musica, Cidade"
          className="theme-outline-ring w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        />
        <textarea
          value={draft.description}
          onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
          placeholder="Descricao curta"
          rows={3}
          className="theme-outline-ring w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        />
        <RegionSelector
          value={draft.regionKey}
          onChange={(region) => setDraft((current) => ({ ...current, regionKey: region.key, countryCode: region.countryCode || current.countryCode }))}
          onClear={() => setDraft((current) => ({ ...current, regionKey: '' }))}
          allowEmpty
          emptyLabel="Sem regiao especifica"
          label="Regiao opcional"
          hint="Use apenas quando o grupo for local."
        />
        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-800">País de descoberta</span>
          <select
            value={draft.countryCode}
            onChange={(event) => setDraft((current) => ({ ...current, countryCode: event.target.value }))}
            className="h-11 w-full rounded-full border-2 border-border bg-white px-4 text-sm"
          >
            <option value="US">Estados Unidos</option>
            <option value="BR">Brasil</option>
            <option value="PT">Portugal</option>
            <option value="CA">Canadá</option>
            <option value="GB">Reino Unido</option>
            <option value="IE">Irlanda</option>
          </select>
        </label>
        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={draft.isPublic}
            onChange={(event) => setDraft((current) => ({ ...current, isPublic: event.target.checked }))}
            className="mt-1"
          />
          <span>
            <strong className="block text-sm">Grupo público</strong>
            <span className="text-xs text-slate-500">Grupos restritos exigem aprovação para acessar o mural.</span>
          </span>
        </label>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating || draft.name.trim().length < 2}
          className="theme-bg theme-shadow w-full rounded-2xl px-4 py-3 text-sm font-bold disabled:opacity-60"
        >
          {creating ? 'Criando...' : 'Criar grupo'}
        </button>
      </div>
    </Modal>
  );
}
