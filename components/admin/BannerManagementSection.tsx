'use client';

import React, { useState } from 'react';
import { CalendarDays, ExternalLink, PencilLine, Plus } from 'lucide-react';
import CloudinaryImageField from '../forms/CloudinaryImageField';
import RegionSelector from '../RegionSelector';
import { Button, Input, Modal, Toggle } from '@/components/ui';
import {
  type FieldErrors,
  hasFieldErrors,
  normalizeUrlFieldValue,
  requiredFieldError,
  validateRequiredUrlField,
} from '@/lib/forms/validation';

export type ManagedBanner = {
  id: string;
  name: string;
  imageUrl: string;
  type: 'LINK' | 'REGISTRATION';
  placement: 'HOME' | 'FEED' | 'BOTH';
  targetUrl: string | null;
  regionKey: string | null;
  isActive: boolean;
  campaignStatus: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  region: { key: string; label: string } | null;
  _count?: { registrations: number; impressions: number };
  registrations?: Array<{
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    locationLabel: string | null;
    createdAt: string;
  }>;
};

type BannerFormState = {
  name: string;
  imageUrl: string;
  type: 'LINK' | 'REGISTRATION';
  targetUrl: string;
  regionKey: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
};

type BannerField = 'name' | 'imageUrl' | 'targetUrl';

const emptyBannerForm: BannerFormState = {
  name: '',
  imageUrl: '',
  type: 'LINK',
  targetUrl: '',
  regionKey: '',
  isActive: true,
  startsAt: '',
  endsAt: '',
};

const BANNER_PREVIEW_LIMIT = 5;
const BANNER_FORM_ID = 'admin-home-banner-form';

const toLocalDateTimeValue = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const fromLocalDateTimeValue = (value: string) => value ? new Date(value).toISOString() : undefined;

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : null;

interface BannerManagementSectionProps {
  banners: ManagedBanner[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
}

const BannerManagementSection: React.FC<BannerManagementSectionProps> = ({ banners, loading, onRefresh, onError, onMessage }) => {
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState<BannerFormState>(emptyBannerForm);
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<BannerField>>({});
  const [showAllBanners, setShowAllBanners] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);

  const visibleBanners = showAllBanners ? banners : banners.slice(0, BANNER_PREVIEW_LIMIT);
  const formProcessingKey = editingBannerId ? `banner:${editingBannerId}:save` : 'banner:create';

  const clearFieldError = (field: BannerField) => setFieldErrors((current) => ({ ...current, [field]: undefined }));

  const resetBannerForm = () => {
    setEditingBannerId(null);
    setBannerForm(emptyBannerForm);
    setFieldErrors({});
    setBannerModalOpen(false);
  };

  const startBannerCreate = () => {
    setEditingBannerId(null);
    setBannerForm(emptyBannerForm);
    setFieldErrors({});
    onError(null);
    onMessage(null);
    setBannerModalOpen(true);
  };

  const startBannerEdit = (banner: ManagedBanner) => {
    setEditingBannerId(banner.id);
    setBannerForm({
      name: banner.name,
      imageUrl: banner.imageUrl,
      type: banner.type,
      targetUrl: banner.targetUrl || '',
      regionKey: banner.regionKey || '',
      isActive: banner.isActive,
      startsAt: toLocalDateTimeValue(banner.startsAt),
      endsAt: toLocalDateTimeValue(banner.endsAt),
    });
    setFieldErrors({});
    onError(null);
    onMessage(null);
    setBannerModalOpen(true);
  };

  const runBannerAction = async (key: string, request: () => Promise<Response>, successMessage: string, resetForm = false) => {
    setProcessingKey(key);
    onError(null);
    onMessage(null);
    try {
      const response = await request();
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Nao foi possivel salvar o banner.');
      if (resetForm) resetBannerForm();
      onMessage(successMessage);
      await onRefresh();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Nao foi possivel salvar o banner.');
    } finally {
      setProcessingKey(null);
    }
  };

  const buildBannerPayload = (form: BannerFormState) => ({
    name: form.name.trim(),
    imageUrl: normalizeUrlFieldValue(form.imageUrl),
    type: form.type,
    targetUrl: form.type === 'LINK' ? normalizeUrlFieldValue(form.targetUrl) : undefined,
    regionKey: form.regionKey || undefined,
    isActive: form.isActive,
    startsAt: fromLocalDateTimeValue(form.startsAt),
    endsAt: fromLocalDateTimeValue(form.endsAt),
  });

  const submitBanner = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FieldErrors<BannerField> = {};
    if (!bannerForm.name.trim()) nextErrors.name = requiredFieldError('o nome do banner');
    const imageUrlError = validateRequiredUrlField(bannerForm.imageUrl, 'o link da imagem');
    if (imageUrlError) nextErrors.imageUrl = imageUrlError;
    if (bannerForm.type === 'LINK') {
      const targetUrlError = validateRequiredUrlField(bannerForm.targetUrl, 'o link de destino');
      if (targetUrlError) nextErrors.targetUrl = targetUrlError;
    }
    setFieldErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) {
      onError(bannerForm.type === 'LINK' ? 'Preencha nome, imagem e link do banner.' : 'Preencha nome e imagem do banner.');
      return;
    }

    const route = editingBannerId ? `/api/admin/banners/${editingBannerId}` : '/api/admin/banners';
    await runBannerAction(
      formProcessingKey,
      () => fetch(route, {
        method: editingBannerId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBannerPayload(bannerForm)),
      }),
      editingBannerId ? 'Banner atualizado.' : 'Banner criado.',
      true,
    );
  };

  const toggleBannerStatus = async (banner: ManagedBanner) => {
    await runBannerAction(
      `banner:${banner.id}:toggle`,
      () => fetch(`/api/admin/banners/${banner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: banner.name,
          imageUrl: banner.imageUrl,
          type: banner.type,
          targetUrl: banner.type === 'LINK' ? banner.targetUrl : undefined,
          regionKey: banner.regionKey || undefined,
          isActive: !banner.isActive,
          startsAt: banner.startsAt ?? undefined,
          endsAt: banner.endsAt ?? undefined,
        }),
      }),
      banner.isActive ? 'Banner ocultado.' : 'Banner ativado.',
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Banners da Home</h2>
          <p className="mt-1 text-sm text-slate-500">Gerencie os banners comerciais exibidos no carrossel da Home.</p>
        </div>
        <Button type="button" iconLeft={<Plus size={16} />} onClick={startBannerCreate}>Novo banner</Button>
      </div>

      <Modal
        open={bannerModalOpen}
        onClose={resetBannerForm}
        title={editingBannerId ? 'Editar banner' : 'Novo banner'}
        description="Configure o conteúdo e o período de exibição na Home."
        className="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={resetBannerForm} disabled={processingKey !== null}>Cancelar</Button>
            <Button type="submit" form={BANNER_FORM_ID} loading={processingKey === formProcessingKey} disabled={processingKey !== null}>
              {editingBannerId ? 'Salvar banner' : 'Cadastrar banner'}
            </Button>
          </>
        }
      >
        <form id={BANNER_FORM_ID} onSubmit={submitBanner} className="max-h-[68vh] space-y-5 overflow-y-auto pr-1">
          <section className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Conteudo</p>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(180px,1fr)]">
              <label className="space-y-2">
                <span className="text-xs font-bold text-slate-600">Nome interno</span>
                <Input
                  value={bannerForm.name}
                  onChange={(event) => {
                    clearFieldError('name');
                    setBannerForm((current) => ({ ...current, name: event.target.value }));
                  }}
                  placeholder="Ex.: campanha de setembro"
                  state={fieldErrors.name ? 'error' : 'default'}
                  helperText={fieldErrors.name}
                />
              </label>
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-600">Tipo de acao</span>
                <div className="grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1">
                  {([{ value: 'LINK', label: 'Link' }, { value: 'REGISTRATION', label: 'Cadastro' }] as const).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBannerForm((current) => ({ ...current, type: option.value }))}
                      className={`h-9 rounded-full px-3 text-xs font-semibold transition ${bannerForm.type === option.value ? 'bg-white theme-text shadow-sm' : 'text-slate-500'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <CloudinaryImageField
              value={bannerForm.imageUrl}
              onChange={(value) => setBannerForm((current) => ({ ...current, imageUrl: value }))}
              onClearError={() => clearFieldError('imageUrl')}
              error={fieldErrors.imageUrl}
              folder="banners"
              placeholder="Link da imagem do banner"
              hint="Envie o banner via Cloudinary ou cole uma URL publica."
            />

            {bannerForm.type === 'LINK' ? (
              <label className="block max-w-xl space-y-2">
                <span className="text-xs font-bold text-slate-600">Link de destino</span>
                <Input
                  type="url"
                  value={bannerForm.targetUrl}
                  onChange={(event) => {
                    clearFieldError('targetUrl');
                    setBannerForm((current) => ({ ...current, targetUrl: event.target.value }));
                  }}
                  onBlur={() => setBannerForm((current) => ({ ...current, targetUrl: normalizeUrlFieldValue(current.targetUrl) }))}
                  placeholder="https://exemplo.com"
                  state={fieldErrors.targetUrl ? 'error' : 'default'}
                  helperText={fieldErrors.targetUrl}
                />
              </label>
            ) : null}
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Publicacao</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <RegionSelector
                  value={bannerForm.regionKey}
                  onChange={(region) => setBannerForm((current) => ({ ...current, regionKey: region.key }))}
                  onClear={() => setBannerForm((current) => ({ ...current, regionKey: '' }))}
                  allowEmpty
                  emptyLabel="Global"
                  hint="Deixe global ou escolha uma regiao especifica."
                />
              </div>
              <label className="space-y-2">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-600"><CalendarDays size={14} /> Inicio</span>
                <Input type="datetime-local" value={bannerForm.startsAt} onChange={(event) => setBannerForm((current) => ({ ...current, startsAt: event.target.value }))} />
              </label>
              <label className="space-y-2">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-600"><CalendarDays size={14} /> Termino</span>
                <Input type="datetime-local" value={bannerForm.endsAt} onChange={(event) => setBannerForm((current) => ({ ...current, endsAt: event.target.value }))} />
              </label>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 sm:col-span-2">
                <Toggle
                  checked={bannerForm.isActive}
                  onChange={(isActive) => setBannerForm((current) => ({ ...current, isActive }))}
                  label={<span><span className="block font-semibold">Banner ativo</span><span className="text-xs text-slate-500">A agenda de inicio e termino continua sendo respeitada.</span></span>}
                />
              </div>
            </div>
          </section>
        </form>
      </Modal>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-3xl bg-white shadow-sm" />)}
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-7 text-center text-sm font-medium text-slate-500">Nenhum banner da Home cadastrado ainda.</div>
      ) : (
        <div className="space-y-3">
          {banners.length > BANNER_PREVIEW_LIMIT ? (
            <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => setShowAllBanners((current) => !current)}>{showAllBanners ? 'Mostrar menos' : `Ver todos (${banners.length})`}</Button></div>
          ) : null}

          {visibleBanners.map((banner) => (
            <article key={banner.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40">
              <div className="grid gap-4 sm:grid-cols-[128px_minmax(0,1fr)]">
                <img src={banner.imageUrl} alt={banner.name} className="aspect-[4/3] w-full rounded-2xl object-cover" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold theme-text">{banner.name}</h3>
                      <p className="mt-1 text-xs font-medium text-slate-500">{banner.region?.label || 'Todas as regioes'} · {banner.type === 'LINK' ? 'Link externo' : 'Cadastro de interesse'}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${banner.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{banner.isActive ? 'Ativo' : 'Oculto'}</span>
                  </div>

                  <div className="mt-3 grid max-w-md grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-slate-50 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Impressoes</p><p className="text-sm font-bold text-slate-700">{banner._count?.impressions ?? 0}</p></div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cadastros</p><p className="text-sm font-bold text-slate-700">{banner._count?.registrations ?? 0}</p></div>
                  </div>

                  {banner.startsAt || banner.endsAt ? <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><CalendarDays size={14} /> {formatDate(banner.startsAt) || 'Agora'} ate {formatDate(banner.endsAt) || 'sem data final'}</p> : null}
                  {banner.type === 'LINK' && banner.targetUrl ? (
                    <a href={banner.targetUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold theme-text"><ExternalLink size={14} /> Abrir destino</a>
                  ) : banner.registrations?.length ? (
                    <p className="mt-3 truncate text-xs text-slate-500">Ultimo cadastro: {banner.registrations[0].name || banner.registrations[0].email || 'Usuario'}</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <Button variant="ghost" size="sm" iconLeft={<PencilLine size={15} />} onClick={() => startBannerEdit(banner)} disabled={processingKey !== null}>Editar</Button>
                <Button variant={banner.isActive ? 'destructive' : 'primary'} size="sm" loading={processingKey === `banner:${banner.id}:toggle`} disabled={processingKey !== null} onClick={() => void toggleBannerStatus(banner)}>{banner.isActive ? 'Ocultar' : 'Ativar'}</Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default BannerManagementSection;
