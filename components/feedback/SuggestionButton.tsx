'use client';

import React, { useMemo, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useToast } from './ToastProvider';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Input';

type SuggestionCategoryValue = 'FUNCTIONALITY' | 'IMPROVEMENT';

const categoryOptions: Array<{
  value: SuggestionCategoryValue;
  label: string;
  description: string;
}> = [
  {
    value: 'FUNCTIONALITY',
    label: 'Funcionalidade',
    description: 'Nova ideia ou recurso que ainda não existe.',
  },
  {
    value: 'IMPROVEMENT',
    label: 'Melhoria',
    description: 'Ajuste em algo que já existe na plataforma.',
  },
];

const SuggestionButton: React.FC = () => {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<SuggestionCategoryValue>('FUNCTIONALITY');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedCategory = useMemo(
    () => categoryOptions.find((option) => option.value === category) ?? categoryOptions[0],
    [category],
  );

  const resetForm = () => {
    setCategory('FUNCTIONALITY');
    setMessage('');
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  React.useEffect(() => {
    const openFromNavigation = () => setOpen(true);

    window.addEventListener('gringoou:open-suggestion-modal', openFromNavigation);

    return () => {
      window.removeEventListener('gringoou:open-suggestion-modal', openFromNavigation);
    };
  }, []);

  const submitSuggestion = async () => {
    if (message.trim().length < 8) {
      showToast('Descreva melhor a sua sugestão antes de enviar.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          message: message.trim(),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showToast(payload?.error ?? 'Nao foi possível enviar sua sugestão.', 'error');
        return;
      }

      showToast('Sugestão enviada. Obrigado por ajudar a evoluir a plataforma.', 'success');
      closeModal();
    } catch (error) {
      console.error('Failed to submit suggestion:', error);
      showToast('Não foi possível enviar sua sugestão.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
{/*       <button
        type="button"
        onClick={() => setOpen(true)}
        className="theme-bg theme-bg-hover theme-shadow fixed bottom-28 right-5 z-[70] inline-flex h-14 w-14 items-center justify-center rounded-full transition lg:bottom-8 lg:right-8 lg:h-auto lg:w-auto lg:gap-2 lg:px-4 lg:py-3"
        aria-label="Enviar sugestão"
      >
        <MessageSquarePlus size={18} />
        <span className="hidden lg:inline">Sugestão</span>
      </button>
 */}
      <Modal
        open={open}
        onClose={closeModal}
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={closeModal} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="primary" fullWidth loading={submitting} onClick={() => void submitSuggestion()}>
              Enviar sugestao
            </Button>
          </>
        }
      >
        <div className="theme-soft-surface inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
          <Lightbulb size={14} />
          Sugestao
        </div>
        <h2 className="mt-3 text-h3 font-bold text-slate-900">Envie suas sugestoes</h2>
        <p className="mt-2 text-body-sm leading-relaxed text-slate-500">
          Escolha o tipo de sugestao e descreva o que faria diferenca para voce na comunidade.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {categoryOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCategory(option.value)}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                category === option.value
                  ? 'theme-soft-surface shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <p className="text-body-sm font-bold">{option.label}</p>
              <p className="mt-1 text-caption leading-relaxed text-slate-500">{option.description}</p>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <p className="mb-2 text-caption font-bold uppercase tracking-wide text-slate-400">
            {selectedCategory.label}
          </p>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            placeholder="Exemplo: seria melhor ter um filtro por tipo de documento na comunidade."
          />
          <p className="mt-2 text-right text-caption text-slate-400">{message.trim().length}/600</p>
        </div>
      </Modal>
    </>
  );
};

export default SuggestionButton;
