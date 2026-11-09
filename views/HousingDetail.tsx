'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, ExternalLink, Home, MapPin, MoreHorizontal, PencilLine, Phone, WalletCards } from 'lucide-react';
import { ImageEditMenu } from '@/components/ui/ImageEditMenu';
import ImageGalleryField from '@/components/forms/ImageGalleryField';
import { ImageLightbox } from '@/components/community/ImageLightbox';
import { useToast } from '@/components/feedback/ToastProvider';
import { Button, Input, Modal, Select, Textarea } from '@/components/ui';
import { ContentColumn } from '@/components/ui/ContentColumn';
import { notifyContentUpdated } from '@/lib/content-refresh';
import { Dropdown } from '@/components/ui/Dropdown';
import { BackBar } from '@/components/ui/BackBar';
import { PublisherSignature } from '@/components/ui/PublisherSignature';
import type { Publisher } from '@/lib/publisher';
import CommentWall from '@/components/community/CommentWall';

type Housing = { id: string; title: string; description: string; propertyType: string; locationLabel: string; price: string; imageUrl?: string | null; galleryUrls: string[]; contactUrl?: string | null; canEdit?: boolean; createdBy?: { name?: string | null }; publisher?: Publisher | null };

export default function HousingDetail({ housingId }: { housingId: string }) {
  const { showToast } = useToast();
  const [item, setItem] = useState<Housing | null>(null);
  const [draft, setDraft] = useState<Housing | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => { let ignore = false; void fetch(`/api/housing/${housingId}`).then(async (response) => { const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error || 'Moradia não encontrada.'); if (!ignore) { setItem(payload.housing); setDraft(payload.housing); } }).catch((error) => { if (!ignore) showToast(error instanceof Error ? error.message : 'Moradia não encontrada.', 'error'); }).finally(() => { if (!ignore) setLoading(false); }); return () => { ignore = true; }; }, [housingId, showToast]);

  const updateDraft = <K extends keyof Housing>(field: K, value: Housing[K]) => setDraft((current) => current ? { ...current, [field]: value } : current);
  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/housing/${housingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: draft.title, description: draft.description, propertyType: draft.propertyType, locationLabel: draft.locationLabel, price: draft.price, imageUrl: draft.imageUrl || undefined, galleryUrls: draft.galleryUrls.filter(Boolean), contactUrl: draft.contactUrl || undefined }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível atualizar a moradia.');
      setItem((current) => current ? { ...current, ...payload.housing, canEdit: current.canEdit } : current);
      setEditing(false);
      notifyContentUpdated();
      showToast('Moradia atualizada.', 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível atualizar a moradia.', 'error'); }
    finally { setSaving(false); }
  };

  const saveCover = async (url: string) => {
    if (!item) return 'Moradia não encontrada.';
    const response = await fetch(`/api/housing/${housingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: item.title, description: item.description, propertyType: item.propertyType, locationLabel: item.locationLabel, price: item.price, imageUrl: url, galleryUrls: item.galleryUrls ?? [], contactUrl: item.contactUrl || undefined }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return payload?.error || 'Não foi possível atualizar a capa.';
    setCoverFailed(false);
    setItem((current) => (current ? { ...current, ...payload.housing, canEdit: current.canEdit } : current));
    notifyContentUpdated();
    showToast('Capa atualizada.', 'success');
    return null;
  };

  if (loading) return <ContentColumn size="compact" className="space-y-4 pb-6"><div className="h-72 animate-pulse rounded-[28px] bg-slate-100" /></ContentColumn>;
  if (!item) return <ContentColumn size="compact" className="pb-10 text-center text-muted-foreground">Moradia não encontrada.</ContentColumn>;
  const contactIsUrl = Boolean(item.contactUrl && /^https?:\/\//i.test(item.contactUrl));
  const contactHref = item.contactUrl ? (contactIsUrl ? item.contactUrl : `tel:${item.contactUrl.replace(/\D/g, '')}`) : '';
  const amount = Number(item.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
  const formattedPrice = Number.isFinite(amount) && amount > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount) : item.price;

  return <ContentColumn size="compact" className="animate-in pb-24 fade-in duration-500">
    <BackBar fallbackHref="/housing" label="Moradia" />
    <div className="overflow-hidden bg-white sm:rounded-card">
      {item.canEdit ? (
        <div className="flex items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-1.5 sm:px-6">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800"><BadgeCheck size={14} aria-hidden /> Você gerencia este anúncio</p>
          <Dropdown align="right" trigger={<span className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-800 transition hover:bg-emerald-100"><MoreHorizontal size={18} /></span>} sections={[{ heading: 'Ações da moradia', items: [{ label: 'Editar moradia', icon: <PencilLine size={16} />, onClick: () => { setDraft(item); setEditing(true); } }] }]} />
        </div>
      ) : null}
      <div className="relative h-56 overflow-hidden bg-gradient-to-br from-[#004380] via-[#0065bf] to-[#66b6ff] sm:h-64">
        {item.imageUrl && !coverFailed ? (
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" onError={() => setCoverFailed(true)} />
        ) : (
          <div className="flex h-full items-center justify-center text-white/30" aria-hidden><Home size={72} /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
        {item.canEdit ? <ImageEditMenu folder="housing" kind="cover" src={item.imageUrl} className="bottom-3 right-3" onUploaded={saveCover} /> : null}
      </div>

      <div className="space-y-7 px-5 pb-2 pt-6 sm:px-7">
        <header className="space-y-3">
          <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">{item.propertyType}</span>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl">{item.title}</h1>
          <p className="flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={15} className="shrink-0 text-slate-400" aria-hidden />{item.locationLabel}</p>
          <p className="flex items-baseline gap-1.5 text-2xl font-extrabold text-brand-600">{formattedPrice}</p>
        </header>

        {contactHref ? (
          <a href={contactHref} target={contactIsUrl ? '_blank' : undefined} rel={contactIsUrl ? 'noreferrer' : undefined} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-105">
            {contactIsUrl ? <ExternalLink size={18} /> : <Phone size={18} />} Entrar em contato
          </a>
        ) : null}

        <section aria-label="Sobre a moradia">
          <h2 className="text-base font-bold text-slate-900">Sobre a moradia</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{item.description}</p>
          <PublisherSignature className="mt-4" publisher={item.publisher ?? { name: item.createdBy?.name || 'Membro da comunidade', image: null, href: null, kind: 'USER' }} />
        </section>

        {item.galleryUrls?.length ? (
          <section aria-label="Galeria" className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Fotos</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {item.galleryUrls.map((url, index) => (
                <button key={url + index} type="button" onClick={() => setLightboxImage(url)} className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                  <img src={url} alt={`${item.title} - foto ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <CommentWall endpoint={`/api/housing/${housingId}/comments`} title="Comentários sobre a moradia" />
      </div>
    </div>
    <Modal open={editing} onClose={() => setEditing(false)} title="Editar moradia" description="Atualize os dados e a galeria. Para trocar a capa, use a câmera sobre a imagem." className="max-w-xl"><div className="space-y-3"><ImageGalleryField value={draft?.galleryUrls || []} onChange={(value) => updateDraft('galleryUrls', value)} folder="housing" maxItems={6} hint="Adicione até 6 fotos dos ambientes." /><Input value={draft?.title || ''} onChange={(event) => updateDraft('title', event.target.value)} placeholder="Título" /><Textarea value={draft?.description || ''} onChange={(event) => updateDraft('description', event.target.value)} placeholder="Descrição" /><Select value={draft?.propertyType || ''} onChange={(event) => updateDraft('propertyType', event.target.value)}><option>Apartamento</option><option>Casa</option><option>Quarto</option><option>República</option></Select><Input value={draft?.locationLabel || ''} onChange={(event) => updateDraft('locationLabel', event.target.value)} placeholder="Localização" /><Input value={draft?.price || ''} onChange={(event) => updateDraft('price', event.target.value)} placeholder="Preço" /><Input value={draft?.contactUrl || ''} onChange={(event) => updateDraft('contactUrl', event.target.value)} placeholder="Link ou telefone para contato" /><Button fullWidth loading={saving} onClick={() => void save()}>Salvar alterações</Button></div></Modal>
    <ImageLightbox open={Boolean(lightboxImage)} src={lightboxImage || ''} alt={`Imagem ampliada de ${item.title}`} onClose={() => setLightboxImage(null)} />
  </ContentColumn>;
}
