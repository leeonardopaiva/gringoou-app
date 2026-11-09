'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '../components/navigation/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { ContentColumn } from '../components/ui/ContentColumn';
import { useToast } from '../components/feedback/ToastProvider';
import CloudinaryImageField from '../components/forms/CloudinaryImageField';
import ImageGalleryField from '../components/forms/ImageGalleryField';
import AddressAutocomplete from '../components/ui/AddressAutocomplete';
import type { User } from '../types';
import type { MarketplaceItemContract } from '../lib/content-contracts';

const CATEGORIES = [
  'Eletrônicos', 'Móveis', 'Eletrodomésticos', 'Roupas', 'Brinquedos',
  'Esportes', 'Livros', 'Ferramentas', 'Automóveis', 'Outros',
];

const CONDITIONS = [
  { id: 'NEW', label: 'Novo' },
  { id: 'LIKE_NEW', label: 'Como novo' },
  { id: 'GOOD', label: 'Bom' },
  { id: 'FAIR', label: 'Regular' },
  { id: 'POOR', label: 'Ruim' },
];

type MarketplaceEditProps = { itemId: string; user: User };

/** Edição de anúncio pelo proprietário. Editar um anúncio rejeitado o reenvia para revisão (regra no servidor). */
const MarketplaceEdit: React.FC<MarketplaceEditProps> = ({ itemId }) => {
  const router = useRouter();
  const { showToast } = useToast();
  const [item, setItem] = useState<MarketplaceItemContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locationChanged, setLocationChanged] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Outros', condition: 'GOOD', isFree: false, price: '',
    locationLabel: '', imageUrl: '', galleryUrls: [] as string[],
    latitude: null as number | null, longitude: null as number | null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/marketplace/${itemId}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.item) throw new Error(payload?.error ?? 'Anúncio não encontrado.');
        if (cancelled) return;
        const data = payload.item as MarketplaceItemContract;
        setItem(data);
        setForm({
          title: data.title,
          description: data.description,
          category: data.category,
          condition: data.condition,
          isFree: data.isFree,
          price: data.priceCents != null ? (data.priceCents / 100).toFixed(2) : '',
          locationLabel: data.locationLabel,
          imageUrl: data.imageUrl ?? '',
          galleryUrls: data.galleryUrls,
          // A API só entrega a área aproximada; a coordenada salva só é reenviada se o endereço mudar.
          latitude: null,
          longitude: null,
        });
      } catch (error) {
        if (!cancelled) showToast(error instanceof Error ? error.message : 'Anúncio não encontrado.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId, showToast]);

  const backHref = `/marketplace/${itemId}`;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.title.trim().length < 3 || form.description.trim().length < 10) {
      showToast('Informe um título (mín. 3) e uma descrição (mín. 10 caracteres).', 'error');
      return;
    }
    if (!form.isFree && !(Number(form.price) >= 0 && form.price !== '')) {
      showToast('Informe um preço válido.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/marketplace/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          condition: form.condition,
          isFree: form.isFree,
          priceCents: form.isFree ? null : Math.round(Number(form.price) * 100),
          locationLabel: form.locationLabel,
          imageUrl: form.imageUrl.trim() ? form.imageUrl.trim() : null,
          galleryUrls: form.galleryUrls,
          ...(locationChanged ? { latitude: form.latitude, longitude: form.longitude } : {}),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        showToast(payload?.error ?? 'Não foi possível salvar o anúncio.', 'error');
        return;
      }
      showToast(
        item?.status === 'REJECTED' ? 'Anúncio reenviado para revisão.' : 'Anúncio atualizado.',
        'success',
      );
      router.push(backHref);
      router.refresh();
    } catch {
      showToast('Não foi possível salvar o anúncio.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ContentColumn size="reading" className="space-y-4 pb-20">
        <Skeleton.Card />
      </ContentColumn>
    );
  }

  if (!item || !item.canEdit) {
    return (
      <ContentColumn size="reading" className="pb-20">
        <PageHeader title="Editar anúncio" backHref="/marketplace" />
        <p className="mt-6 text-center text-sm text-slate-500">Você não pode editar este anúncio.</p>
      </ContentColumn>
    );
  }

  return (
    <ContentColumn size="reading" className="pb-24">
      <PageHeader title="Editar anúncio" backHref={backHref} />

      {item.status === 'REJECTED' ? (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          Este anúncio foi rejeitado{item.moderationReason ? `: ${item.moderationReason}` : '.'} Ao salvar, ele será
          reenviado para revisão.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Título</label>
          <Input value={form.title} maxLength={120} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Descrição</label>
          <textarea
            value={form.description}
            maxLength={4000}
            rows={5}
            onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Categoria</label>
            <select
              value={form.category}
              onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              {(CATEGORIES.includes(form.category) ? CATEGORIES : [form.category, ...CATEGORIES]).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Condição</label>
            <select
              value={form.condition}
              onChange={(e) => setForm((c) => ({ ...c, condition: e.target.value as typeof c.condition }))}
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              {CONDITIONS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 pb-2.5 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.isFree}
              onChange={(e) => setForm((c) => ({ ...c, isFree: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-brand-500"
            />
            Grátis / Doação
          </label>
          {!form.isFree ? (
            <div className="flex-1">
              <label className="mb-1 block text-xs font-bold text-slate-600">Preço (US$)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((c) => ({ ...c, price: e.target.value }))}
              />
            </div>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Localização</label>
          <AddressAutocomplete
            value={form.locationLabel}
            onChange={(value, latitude, longitude) =>
              {
                setLocationChanged(true);
                setForm((c) => ({ ...c, locationLabel: value, latitude: latitude ?? null, longitude: longitude ?? null }));
              }
            }
            placeholder="Bairro, cidade ou endereço"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Imagem principal</label>
          <CloudinaryImageField
            value={form.imageUrl}
            onChange={(value) => setForm((c) => ({ ...c, imageUrl: value }))}
            folder="marketplace"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Galeria</label>
          <ImageGalleryField
            value={form.galleryUrls}
            onChange={(value) => setForm((c) => ({ ...c, galleryUrls: value }))}
            folder="marketplace"
            maxItems={8}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" loading={submitting}>
            {item.status === 'REJECTED' ? 'Salvar e reenviar' : 'Salvar'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push(backHref)}>
            Cancelar
          </Button>
        </div>
      </form>
    </ContentColumn>
  );
};

export default MarketplaceEdit;
