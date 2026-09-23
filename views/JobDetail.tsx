'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, ExternalLink, MapPin, MoreHorizontal, PencilLine, Phone, WalletCards } from 'lucide-react';
import CloudinaryImageField from '@/components/forms/CloudinaryImageField';
import ImageGalleryField from '@/components/forms/ImageGalleryField';
import { ImageLightbox } from '@/components/community/ImageLightbox';
import { useToast } from '@/components/feedback/ToastProvider';
import { Button, Input, Modal, Select, Textarea } from '@/components/ui';
import { ContentColumn } from '@/components/ui/ContentColumn';
import { notifyContentUpdated } from '@/lib/content-refresh';
import { Dropdown } from '@/components/ui/Dropdown';

type Job = {
  id: string;
  title: string;
  company: string;
  description: string;
  employmentType: string;
  locationLabel: string;
  countryCode: string;
  salary?: string | null;
  contactUrl?: string | null;
  imageUrl?: string | null;
  galleryUrls: string[];
  businessId?: string | null;
  canEdit?: boolean;
  createdBy?: { name?: string | null };
};

export default function JobDetail({ jobId }: { jobId: string }) {
  const { showToast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [draft, setDraft] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    void fetch('/api/jobs/' + jobId)
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Vaga não encontrada.');
        if (!ignore) {
          setJob(payload.job);
          setDraft(payload.job);
        }
      })
      .catch((error) => {
        if (!ignore) showToast(error instanceof Error ? error.message : 'Vaga não encontrada.', 'error');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [jobId, showToast]);

  const updateDraft = <K extends keyof Job>(field: K, value: Job[K]) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const openEditor = () => {
    setDraft(job);
    setEditing(true);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const response = await fetch('/api/jobs/' + jobId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          company: draft.company,
          description: draft.description,
          employmentType: draft.employmentType,
          locationLabel: draft.locationLabel,
          countryCode: draft.countryCode,
          salary: draft.salary || undefined,
          contactUrl: draft.contactUrl || undefined,
          imageUrl: draft.imageUrl || undefined,
          galleryUrls: (draft.galleryUrls || []).filter(Boolean),
          businessId: draft.businessId || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível atualizar a vaga.');
      setJob((current) => (current ? { ...current, ...payload.job, canEdit: current.canEdit } : current));
      setEditing(false);
      notifyContentUpdated();
      showToast('Vaga atualizada.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível atualizar a vaga.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ContentColumn className="space-y-4 px-5 py-6"><div className="h-64 animate-pulse rounded-[28px] bg-slate-100" /></ContentColumn>;
  }
  if (!job) {
    return <ContentColumn className="px-5 py-10 text-center text-muted-foreground">Vaga não encontrada.</ContentColumn>;
  }
  const contactIsUrl = Boolean(job.contactUrl && /^https?:\/\//i.test(job.contactUrl));
  const contactHref = job.contactUrl
    ? contactIsUrl
      ? job.contactUrl
      : 'tel:' + job.contactUrl.replace(/\D/g, '')
    : '';

  return (
    <ContentColumn className="animate-in bg-white pb-24 fade-in duration-500">
      <header className="relative flex min-h-72 items-end overflow-hidden bg-foreground p-6 text-white">
        {job.imageUrl ? (
          <img src={job.imageUrl} alt={'Capa da vaga ' + job.title} className="absolute inset-0 h-full w-full object-cover opacity-60" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(45,212,191,0.28),_transparent_40%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <Link href="/vagas" className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur"><ArrowLeft size={18} /></Link>
        {job.canEdit ? <div className="absolute right-4 top-4 z-20"><Dropdown align="right" trigger={<span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition hover:bg-white"><MoreHorizontal size={20} /></span>} sections={[{ heading: 'Ações da vaga', items: [{ label: 'Editar vaga', icon: <PencilLine size={16} />, onClick: openEditor }] }]} /></div> : null}
        <div className="relative">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest">{job.employmentType}</span>
          <h1 className="mt-4 text-3xl font-bold">{job.title}</h1>
          <p className="mt-2 flex items-center gap-2 text-white/80"><Briefcase size={16} /> {job.company}</p>
        </div>
      </header>

      <div className="space-y-7 px-5 pt-8">
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl bg-slate-50 p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"><MapPin size={15} /> Localização</p><p className="mt-2 font-bold text-foreground">{job.locationLabel}</p></div>
          <div className="rounded-3xl bg-slate-50 p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"><WalletCards size={15} /> Salário</p><p className="mt-2 font-bold text-foreground">{job.salary || 'A combinar'}</p></div>
        </section>
        <section className="border-t border-border pt-6">
          <h2 className="text-h3 font-bold">Sobre a vaga</h2>
          <p className="mt-3 whitespace-pre-wrap text-body-sm leading-7 text-muted-foreground">{job.description}</p>
          <p className="mt-4 text-xs text-slate-400">Publicado por {job.createdBy?.name || job.company}</p>{job.canEdit ? <span className="mt-3 inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-700">Você é proprietário</span> : null}
        </section>
        {job.galleryUrls?.length ? <section className="border-t border-border pt-6"><h2 className="text-h3 font-bold">Galeria</h2><div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">{job.galleryUrls.map((url, index) => <button key={url + index} type="button" onClick={() => setLightboxImage(url)} className="aspect-square overflow-hidden rounded-2xl bg-slate-100"><img src={url} alt={`${job.title} - foto ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div></section> : null}
        {contactHref ? <a href={contactHref} target={contactIsUrl ? '_blank' : undefined} rel={contactIsUrl ? 'noreferrer' : undefined} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white">{contactIsUrl ? <ExternalLink size={17} /> : <Phone size={17} />} {contactIsUrl ? 'Candidatar-se' : 'Ligar para o contato'}</a> : null}
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar vaga" description="Atualize os dados e a capa da publicação." className="max-w-xl">
        <div className="space-y-3">
          <CloudinaryImageField value={draft?.imageUrl || ''} onChange={(value) => updateDraft('imageUrl', value)} folder="jobs" height={180} hint="Clique na área para selecionar a capa da vaga." />
          <ImageGalleryField value={draft?.galleryUrls || []} onChange={(value) => updateDraft('galleryUrls', value)} folder="jobs" maxItems={6} hint="Adicione até 6 fotos da vaga, equipe ou ambiente." />
          <Input value={draft?.title || ''} onChange={(event) => updateDraft('title', event.target.value)} placeholder="Título" />
          <Input value={draft?.company || ''} onChange={(event) => updateDraft('company', event.target.value)} placeholder="Empresa ou responsável" disabled={Boolean(draft?.businessId)} />
          <Textarea value={draft?.description || ''} onChange={(event) => updateDraft('description', event.target.value)} placeholder="Descrição" />
          <Select value={draft?.employmentType || ''} onChange={(event) => updateDraft('employmentType', event.target.value)}>
            <option>Tempo integral</option><option>Meio período</option><option>Freelancer</option><option>Temporário</option><option>Estágio</option>
          </Select>
          <Input value={draft?.locationLabel || ''} onChange={(event) => updateDraft('locationLabel', event.target.value)} placeholder="Localização" />
          <Input value={draft?.salary || ''} onChange={(event) => updateDraft('salary', event.target.value)} placeholder="Salário" />
          <Input value={draft?.contactUrl || ''} onChange={(event) => updateDraft('contactUrl', event.target.value)} placeholder="Link ou telefone para contato" />
          <Button fullWidth loading={saving} onClick={() => void save()}>Salvar alterações</Button>
        </div>
      </Modal>
      <ImageLightbox open={Boolean(lightboxImage)} src={lightboxImage || ''} alt={`Imagem ampliada de ${job.title}`} onClose={() => setLightboxImage(null)} />
    </ContentColumn>
  );
}
