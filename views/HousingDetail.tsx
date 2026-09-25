'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Home, MapPin, MoreHorizontal, PencilLine, Phone, WalletCards } from 'lucide-react';
import CloudinaryImageField from '@/components/forms/CloudinaryImageField';
import ImageGalleryField from '@/components/forms/ImageGalleryField';
import { ImageLightbox } from '@/components/community/ImageLightbox';
import { useToast } from '@/components/feedback/ToastProvider';
import { Button, Input, Modal, Select, Textarea } from '@/components/ui';
import { ContentColumn } from '@/components/ui/ContentColumn';
import { notifyContentUpdated } from '@/lib/content-refresh';
import { Dropdown } from '@/components/ui/Dropdown';
import CommentWall from '@/components/community/CommentWall';

type Housing = { id: string; title: string; description: string; propertyType: string; locationLabel: string; price: string; imageUrl?: string | null; galleryUrls: string[]; contactUrl?: string | null; canEdit?: boolean; createdBy?: { name?: string | null } };

export default function HousingDetail({ housingId }: { housingId: string }) {
  const { showToast } = useToast();
  const [item, setItem] = useState<Housing | null>(null);
  const [draft, setDraft] = useState<Housing | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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

  if (loading) return <ContentColumn className="space-y-4 px-5 py-6"><div className="h-72 animate-pulse rounded-[28px] bg-slate-100" /></ContentColumn>;
  if (!item) return <ContentColumn className="px-5 py-10 text-center text-muted-foreground">Moradia não encontrada.</ContentColumn>;
  const contactIsUrl = Boolean(item.contactUrl && /^https?:\/\//i.test(item.contactUrl));
  const contactHref = item.contactUrl ? (contactIsUrl ? item.contactUrl : `tel:${item.contactUrl.replace(/\D/g, '')}`) : '';
  const amount = Number(item.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
  const formattedPrice = Number.isFinite(amount) && amount > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount) : item.price;

  return <ContentColumn className="animate-in bg-white pb-24 fade-in duration-500">
    <header className="relative h-72 overflow-hidden bg-foreground">{item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-white/30"><Home size={72} /></div>}<div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" /><Link href="/moradia" className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-foreground"><ArrowLeft size={18} /></Link>{item.canEdit ? <div className="absolute right-4 top-4 z-20"><Dropdown align="right" trigger={<span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition hover:bg-white"><MoreHorizontal size={20} /></span>} sections={[{ heading: 'Ações da moradia', items: [{ label: 'Editar moradia', icon: <PencilLine size={16} />, onClick: () => { setDraft(item); setEditing(true); } }] }]} /></div> : null}<div className="absolute bottom-6 left-5 right-5 text-white"><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur">{item.propertyType}</span><h1 className="mt-3 text-3xl font-bold">{item.title}</h1></div></header>
    <div className="space-y-7 px-5 pt-8"><section className="grid gap-3 sm:grid-cols-2"><div className="rounded-3xl bg-slate-50 p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"><MapPin size={15} /> Localização</p><p className="mt-2 font-bold">{item.locationLabel}</p></div><div className="rounded-3xl bg-slate-50 p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"><WalletCards size={15} /> Valor</p><p className="mt-2 font-bold">{formattedPrice}</p></div></section><section className="border-t border-border pt-6"><h2 className="text-h3 font-bold">Sobre a moradia</h2><p className="mt-3 whitespace-pre-wrap text-body-sm leading-7 text-muted-foreground">{item.description}</p><p className="mt-4 text-xs text-slate-400">Publicado por {item.createdBy?.name || 'Membro da comunidade'}</p>{item.canEdit ? <span className="mt-3 inline-flex rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-700">Você é proprietário</span> : null}</section>{item.galleryUrls?.length ? <section className="border-t border-border pt-6"><h2 className="text-h3 font-bold">Galeria</h2><div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">{item.galleryUrls.map((url, index) => <button key={url + index} type="button" onClick={() => setLightboxImage(url)} className="aspect-square overflow-hidden rounded-2xl bg-slate-100"><img src={url} alt={`${item.title} - foto ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div></section> : null}<CommentWall endpoint={`/api/housing/${housingId}/comments`} title="Comentários sobre a moradia" />{contactHref ? <a href={contactHref} target={contactIsUrl ? '_blank' : undefined} rel={contactIsUrl ? 'noreferrer' : undefined} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white">{contactIsUrl ? <ExternalLink size={17} /> : <Phone size={17} />} Entrar em contato</a> : null}</div>
    <Modal open={editing} onClose={() => setEditing(false)} title="Editar moradia" description="Atualize os dados, a capa e a galeria." className="max-w-xl"><div className="space-y-3"><CloudinaryImageField value={draft?.imageUrl || ''} onChange={(value) => updateDraft('imageUrl', value)} folder="housing" height={180} hint="Selecione a capa da moradia." /><ImageGalleryField value={draft?.galleryUrls || []} onChange={(value) => updateDraft('galleryUrls', value)} folder="housing" maxItems={6} hint="Adicione até 6 fotos dos ambientes." /><Input value={draft?.title || ''} onChange={(event) => updateDraft('title', event.target.value)} placeholder="Título" /><Textarea value={draft?.description || ''} onChange={(event) => updateDraft('description', event.target.value)} placeholder="Descrição" /><Select value={draft?.propertyType || ''} onChange={(event) => updateDraft('propertyType', event.target.value)}><option>Apartamento</option><option>Casa</option><option>Quarto</option><option>República</option></Select><Input value={draft?.locationLabel || ''} onChange={(event) => updateDraft('locationLabel', event.target.value)} placeholder="Localização" /><Input value={draft?.price || ''} onChange={(event) => updateDraft('price', event.target.value)} placeholder="Preço" /><Input value={draft?.contactUrl || ''} onChange={(event) => updateDraft('contactUrl', event.target.value)} placeholder="Link ou telefone para contato" /><Button fullWidth loading={saving} onClick={() => void save()}>Salvar alterações</Button></div></Modal>
    <ImageLightbox open={Boolean(lightboxImage)} src={lightboxImage || ''} alt={`Imagem ampliada de ${item.title}`} onClose={() => setLightboxImage(null)} />
  </ContentColumn>;
}
