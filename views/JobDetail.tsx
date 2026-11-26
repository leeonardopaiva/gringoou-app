'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, ExternalLink, MapPin, MoreHorizontal, PencilLine, Phone, WalletCards } from 'lucide-react';
import CloudinaryImageField from '@/components/forms/CloudinaryImageField';
import ImageGalleryField from '@/components/forms/ImageGalleryField';
import { ImageLightbox } from '@/components/community/ImageLightbox';
import { useToast } from '@/components/feedback/ToastProvider';
import { Button, Input, Modal, Select, Textarea } from '@/components/ui';
import { ContentColumn } from '@/components/ui/ContentColumn';
import { notifyContentUpdated } from '@/lib/content-refresh';
import { Dropdown } from '@/components/ui/Dropdown';
import PageHeader from '@/components/navigation/PageHeader';
import { PublisherSignature } from '@/components/ui/PublisherSignature';
import type { Publisher } from '@/lib/publisher';
import CommentWall from '@/components/community/CommentWall';
import { getUserErrorMessage, sanitizeUserMessage } from '@/lib/user-error';
import { useLanguage } from '@/components/i18n/LanguageProvider';

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
  publisher?: Publisher | null;
};

export default function JobDetail({ jobId }: { jobId: string }) {
  const { tx } = useLanguage();
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
        if (!response.ok) throw new Error(sanitizeUserMessage(payload?.error, 'Vaga não encontrada.'));
        if (!ignore) {
          setJob(payload.job);
          setDraft(payload.job);
        }
      })
      .catch((error) => {
        if (!ignore) showToast(getUserErrorMessage(error, 'Vaga não encontrada.'), 'error');
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
      if (!response.ok) throw new Error(sanitizeUserMessage(payload?.error, 'Não foi possível atualizar a vaga.'));
      setJob((current) => (current ? { ...current, ...payload.job, canEdit: current.canEdit } : current));
      setEditing(false);
      notifyContentUpdated();
      showToast(tx('Vaga atualizada.'), 'success');
    } catch (error) {
      showToast(getUserErrorMessage(error, 'Não foi possível atualizar a vaga.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ContentColumn size="compact" className="space-y-4 pb-6"><div className="h-64 animate-pulse rounded-[28px] bg-slate-100" /></ContentColumn>;
  }
  if (!job) {
    return <ContentColumn size="compact" className="pb-10 text-center text-muted-foreground">{tx('Vaga não encontrada.')}</ContentColumn>;
  }
  const contactIsUrl = Boolean(job.contactUrl && /^https?:\/\//i.test(job.contactUrl));
  const contactHref = job.contactUrl
    ? contactIsUrl
      ? job.contactUrl
      : 'tel:' + job.contactUrl.replace(/\D/g, '')
    : '';

  return (
    <ContentColumn size="compact" className="animate-in pb-24 fade-in duration-500">
      <PageHeader title={tx('Vagas')} backHref="/jobs" historyBack />
      {/* O voltar fica FORA do card (igual aos demais detalhes); o card começa na capa. */}
      <div className="overflow-hidden bg-surface pb-8 sm:rounded-card">
      <header className="relative flex min-h-72 items-end overflow-hidden bg-navy p-6 text-white">
        {job.imageUrl ? (
          <img src={job.imageUrl} alt={'Capa da vaga ' + job.title} className="absolute inset-0 h-full w-full object-cover opacity-60" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(45,212,191,0.28),_transparent_40%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {job.canEdit ? <div className="absolute right-4 top-4 z-20"><Dropdown align="right" trigger={<span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-slate-700 shadow-sm transition hover:bg-surface"><MoreHorizontal size={20} /></span>} sections={[{ heading: tx('Ações da vaga'), items: [{ label: tx('Editar vaga'), icon: <PencilLine size={16} />, onClick: openEditor }] }]} /></div> : null}
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest">{job.employmentType}</span>
            {job.canEdit ? <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{tx('Sua publicação')}</span> : null}
          </div>
          <h1 className="mt-4 text-3xl font-bold">{job.title}</h1>
          <p className="mt-2 flex items-center gap-2 text-white/80"><Briefcase size={16} /> {job.company}</p>
        </div>
      </header>

      <div className="space-y-7 px-5 pt-8">
        <dl aria-label={tx('Resumo da vaga')} className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div className="flex items-center gap-2">
            <dt className="sr-only">{tx('Localização')}</dt>
            <MapPin size={18} className="shrink-0 text-brand-500" aria-hidden />
            <dd className="font-semibold text-foreground">{job.locationLabel}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">{tx('Salário')}</dt>
            <WalletCards size={18} className="shrink-0 text-brand-500" aria-hidden />
            <dd className="font-semibold text-foreground">{job.salary || tx('A combinar')}</dd>
          </div>
        </dl>
        {contactHref ? <a href={contactHref} target={contactIsUrl ? '_blank' : undefined} rel={contactIsUrl ? 'noreferrer' : undefined} className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3.5 text-sm font-bold text-white transition hover:brightness-105">{contactIsUrl ? <ExternalLink size={17} /> : <Phone size={17} />} {contactIsUrl ? tx('Candidatar-se') : tx('Ligar para o contato')}</a> : null}
        <section>
          <h2 className="text-h3 font-bold">{tx('Sobre a vaga')}</h2>
          <p className="mt-3 whitespace-pre-wrap text-body-sm leading-7 text-muted-foreground">{job.description}</p>
        </section>
        <section className="border-t border-border pt-5">
          <PublisherSignature publisher={job.publisher ?? { name: job.createdBy?.name || job.company, image: null, href: null, kind: 'USER' }} />
        </section>
        {job.galleryUrls?.length ? <section className="border-t border-border pt-6"><h2 className="text-h3 font-bold">{tx('Galeria')}</h2><div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">{job.galleryUrls.map((url, index) => <button key={url + index} type="button" onClick={() => setLightboxImage(url)} className="aspect-square overflow-hidden rounded-2xl bg-slate-100"><img src={url} alt={`${job.title} - foto ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div></section> : null}
        <CommentWall endpoint={`/api/jobs/${jobId}/comments`} title={tx('Comentários sobre a vaga')} />
      </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title={tx('Editar vaga')} description={tx('Atualize os dados e a capa da publicação.')} className="max-w-xl">
        <div className="space-y-3">
          <CloudinaryImageField value={draft?.imageUrl || ''} onChange={(value) => updateDraft('imageUrl', value)} folder="jobs" cropAspect={4 / 3} height={180} hint={tx('Clique na área para selecionar a capa da vaga.')} />
          <ImageGalleryField value={draft?.galleryUrls || []} onChange={(value) => updateDraft('galleryUrls', value)} folder="jobs" maxItems={6} hint={tx('Adicione até 6 fotos da vaga, equipe ou ambiente.')} />
          <Input value={draft?.title || ''} onChange={(event) => updateDraft('title', event.target.value)} placeholder={tx('Título')} />
          <Input value={draft?.company || ''} onChange={(event) => updateDraft('company', event.target.value)} placeholder={tx('Empresa ou responsável')} disabled={Boolean(draft?.businessId)} />
          <Textarea value={draft?.description || ''} onChange={(event) => updateDraft('description', event.target.value)} placeholder={tx('Descrição')} />
          <Select value={draft?.employmentType || ''} onChange={(event) => updateDraft('employmentType', event.target.value)}>
            <option>{tx('Tempo integral')}</option><option>{tx('Meio período')}</option><option>{tx('Freelancer')}</option><option>{tx('Temporário')}</option><option>{tx('Estágio')}</option>
          </Select>
          <Input value={draft?.locationLabel || ''} onChange={(event) => updateDraft('locationLabel', event.target.value)} placeholder={tx('Localização')} />
          <Input value={draft?.salary || ''} onChange={(event) => updateDraft('salary', event.target.value)} placeholder={tx('Salário')} />
          <Input value={draft?.contactUrl || ''} onChange={(event) => updateDraft('contactUrl', event.target.value)} placeholder={tx('Link ou telefone para contato')} />
          <Button fullWidth loading={saving} onClick={() => void save()}>{tx('Salvar alterações')}</Button>
        </div>
      </Modal>
      <ImageLightbox open={Boolean(lightboxImage)} src={lightboxImage || ''} alt={`${tx('Imagem ampliada de')} ${job.title}`} onClose={() => setLightboxImage(null)} />
    </ContentColumn>
  );
}
