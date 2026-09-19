import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Copy,
  ExternalLink,
  Globe2,
  Heart,
  Images,
  Instagram,
  MapPin,
  Megaphone,
  MessageCircle,
  PencilLine,
  Phone,
  Share2,
  X,
} from 'lucide-react';
import StarRating from '../components/engagement/StarRating';
import { useToast } from '../components/feedback/ToastProvider';
import CloudinaryImageField from '../components/forms/CloudinaryImageField';
import ImageGalleryField from '../components/forms/ImageGalleryField';
import AddressAutocomplete from '../components/forms/AddressAutocomplete';
import { normalizeUrlFieldValue } from '../lib/forms/validation';
import { User } from '../types';
import { ContentColumn } from '../components/ui/ContentColumn';
import { CharacterCounter } from '../components/ui/CharacterCounter';
import { PublicLinksBlock } from '../components/profile/PublicLinksBlock';
import { BusinessPostsPanel } from '../components/business/BusinessPostsPanel';

interface BusinessDetailProps {
  businessId?: string;
  user: User;
  managementMode?: boolean;
}

type EditModalTab = 'info' | 'contact' | 'media';

type BusinessDetailState = {
  id: string;
  slug: string;
  name: string;
  description: string;
  address: string;
  category: string;
  imageUrl: string;
  galleryUrls: string[];
  phone: string;
  whatsapp: string;
  website: string;
  instagram: string;
  ratingAverage: number;
  ratingCount: number;
  viewerRating: number | null;
  isFavorite: boolean;
  canRate: boolean;
  locationLabel: string;
  createdByName: string;
  canEdit: boolean;
  publicPath: string;
  status: string;
};

const defaultBusiness: BusinessDetailState = {
  id: '',
  slug: '',
  name: 'Negócio local',
  description: 'Os detalhes deste negócio ainda não foram carregados.',
  address: 'Endereço indisponível',
  category: 'Negócio',
  imageUrl: 'https://picsum.photos/seed/minasgrill/800/600',
  galleryUrls: [],
  phone: '',
  whatsapp: '',
  website: '',
  instagram: '',
  ratingAverage: 0,
  ratingCount: 0,
  viewerRating: null,
  isFavorite: false,
  canRate: false,
  locationLabel: '',
  createdByName: 'Comunidade local',
  canEdit: false,
  publicPath: '',
  status: 'PUBLISHED',
};

const normalizePhoneLink = (value: string) => {
  const digits = value.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
};

const normalizeWhatsappLink = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
};

const BusinessDetail: React.FC<BusinessDetailProps> = ({ businessId, user, managementMode = false }) => {
  const { showToast } = useToast();

  const [business, setBusiness] = useState<BusinessDetailState>(defaultBusiness);
  const [loading, setLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalTab, setEditModalTab] = useState<EditModalTab>('info');
  const [savingBusiness, setSavingBusiness] = useState(false);

  const [nameDraft, setNameDraft] = useState('');
  const [categoryDraft, setCategoryDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [addressDraft, setAddressDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [whatsappDraft, setWhatsappDraft] = useState('');
  const [websiteDraft, setWebsiteDraft] = useState('');
  const [instagramDraft, setInstagramDraft] = useState('');
  const [coverDraft, setCoverDraft] = useState('');
  const [galleryDraft, setGalleryDraft] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;

    const fetchBusiness = async () => {
      if (!businessId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`/api/businesses/${businessId}`);
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Negócio não encontrado.');
        }

        if (!ignore) {
          const nextBusiness: BusinessDetailState = {
            id: payload.business.id,
            slug: payload.business.slug,
            name: payload.business.name,
            description: payload.business.description || defaultBusiness.description,
            address: payload.business.address,
            category: payload.business.category,
            imageUrl: payload.business.imageUrl || defaultBusiness.imageUrl,
            galleryUrls: Array.isArray(payload.business.galleryUrls) ? payload.business.galleryUrls : [],
            phone: payload.business.phone || '',
            whatsapp: payload.business.whatsapp || '',
            website: payload.business.website || '',
            instagram: payload.business.instagram || '',
            ratingAverage: Number(payload.business.ratingAverage ?? 0),
            ratingCount: Number(payload.business.ratingCount ?? 0),
            viewerRating: payload.business.viewerRating ?? null,
            isFavorite: Boolean(payload.business.isFavorite),
            canRate: Boolean(payload.business.canRate),
            locationLabel: payload.business.locationLabel || '',
            createdByName: payload.business.createdBy?.name || 'Comunidade local',
            canEdit: Boolean(payload.business.canEdit),
            publicPath: payload.business.publicPath || `/negocios/${payload.business.slug || payload.business.id}`,
            status: payload.business.status || 'PUBLISHED',
          };

          setBusiness(nextBusiness);
          syncDrafts(nextBusiness);
        }
      } catch (error) {
        console.error('Failed to load business detail:', error);
        if (!ignore) {
          showToast(error instanceof Error ? error.message : 'Não foi possível carregar o negócio.', 'error');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void fetchBusiness();

    return () => {
      ignore = true;
    };
  }, [businessId, showToast]);

  const syncDrafts = (source: BusinessDetailState) => {
    setNameDraft(source.name);
    setCategoryDraft(source.category);
    setDescriptionDraft(source.description);
    setAddressDraft(source.address);
    setPhoneDraft(source.phone);
    setWhatsappDraft(source.whatsapp);
    setWebsiteDraft(source.website);
    setInstagramDraft(source.instagram);
    setCoverDraft(source.imageUrl);
    setGalleryDraft(source.galleryUrls);
  };

  const handleOpenEditModal = (tab: EditModalTab) => {
    syncDrafts(business);
    setEditModalTab(tab);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    if (savingBusiness) return;

    syncDrafts(business);
    setIsEditModalOpen(false);
  };

  const handleCopyUrl = async () => {
    const publicUrl =
      typeof window === 'undefined'
        ? business.publicPath
        : `${window.location.origin}${business.publicPath}`;

    try {
      await navigator.clipboard.writeText(publicUrl);
      showToast('Link do negócio copiado.', 'success');
    } catch {
      showToast(publicUrl, 'info', 5000);
    }
  };

  const handleShare = async () => {
    const publicUrl =
      typeof window === 'undefined'
        ? business.publicPath
        : `${window.location.origin}${business.publicPath}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: business.name,
          text: business.description,
          url: publicUrl,
        });
        return;
      } catch {
        return;
      }
    }

    await handleCopyUrl();
  };

  const handleSaveBusiness = async () => {
    setSavingBusiness(true);

    try {
      const response = await fetch(`/api/businesses/${business.slug || business.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: nameDraft.trim(),
          category: categoryDraft.trim(),
          description: descriptionDraft.trim(),
          address: addressDraft.trim(),
          phone: phoneDraft.trim(),
          whatsapp: whatsappDraft.trim(),
          website: normalizeUrlFieldValue(websiteDraft),
          instagram: instagramDraft.trim(),
          imageUrl: normalizeUrlFieldValue(coverDraft),
          galleryUrls: galleryDraft,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showToast(payload?.error ?? 'Não foi possível salvar as alterações.', 'error');
        return;
      }

      const updatedBusiness: BusinessDetailState = {
        ...business,
        name: payload.business.name,
        category: payload.business.category,
        description: payload.business.description || '',
        address: payload.business.address,
        phone: payload.business.phone || '',
        whatsapp: payload.business.whatsapp || '',
        website: payload.business.website || '',
        instagram: payload.business.instagram || '',
        imageUrl: payload.business.imageUrl || defaultBusiness.imageUrl,
        galleryUrls: Array.isArray(payload.business.galleryUrls) ? payload.business.galleryUrls : [],
      };

      setBusiness(updatedBusiness);
      syncDrafts(updatedBusiness);
      setIsEditModalOpen(false);
      showToast('Negócio atualizado com sucesso.', 'success');
    } catch (error) {
      console.error('Failed to save business:', error);
      showToast('Não foi possível salvar as alterações.', 'error');
    } finally {
      setSavingBusiness(false);
    }
  };

  const handleFavoriteToggle = async () => {
    try {
      const response = await fetch(`/api/businesses/${business.slug || business.id}/favorite`, {
        method: business.isFavorite ? 'DELETE' : 'POST',
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showToast(payload?.error ?? 'Nao foi possivel atualizar seus favoritos.', 'error');
        return;
      }

      setBusiness((current) => ({
        ...current,
        isFavorite: Boolean(payload?.isFavorite),
      }));

      showToast(
        payload?.isFavorite ? 'Negocio adicionado aos favoritos.' : 'Negocio removido dos favoritos.',
        'success',
      );
    } catch (error) {
      console.error('Failed to toggle business favorite:', error);
      showToast('Nao foi possivel atualizar seus favoritos.', 'error');
    }
  };

  const handleRateBusiness = async (stars: number) => {
    try {
      const response = await fetch(`/api/businesses/${business.slug || business.id}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stars }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (payload?.viewerRating) {
          setBusiness((current) => ({
            ...current,
            viewerRating: payload.viewerRating,
          }));
        }

        showToast(payload?.error ?? 'Nao foi possivel registrar sua avaliacao.', 'error');
        return;
      }

      setBusiness((current) => ({
        ...current,
        viewerRating: payload.viewerRating,
        ratingAverage: payload.ratingAverage,
        ratingCount: payload.ratingCount,
      }));

      showToast('Sua avaliacao foi registrada.', 'success');
    } catch (error) {
      console.error('Failed to rate business:', error);
      showToast('Nao foi possivel registrar sua avaliacao.', 'error');
    }
  };

  const publicUrl =
    typeof window === 'undefined'
      ? business.publicPath
      : `${window.location.origin}${business.publicPath}`;

  const callHref = normalizePhoneLink(business.phone || business.whatsapp);
  const whatsappHref = normalizeWhatsappLink(business.whatsapp || business.phone);
  const galleryImages = [business.imageUrl, ...business.galleryUrls].filter(Boolean);
  const isPendingReview = business.status === 'PENDING_REVIEW';

  if (loading) {
    return (
      <ContentColumn className="animate-in space-y-5 px-5 py-6 fade-in duration-500">
        <div className="h-64 animate-pulse rounded-[28px] bg-slate-100" />
        <div className="space-y-3">
          <div className="h-8 w-2/3 animate-pulse rounded-full bg-slate-100" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-100" />
          <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      </ContentColumn>
    );
  }

  if (managementMode && !business.canEdit) {
    return (
      <ContentColumn className="px-5 py-8">
        <div className="rounded-[28px] border border-red-100 bg-red-50 p-6 text-center">
          <h1 className="text-xl font-bold text-red-700">Acesso não autorizado</h1>
          <p className="mt-2 text-sm text-red-600">Somente proprietários e administradores podem gerenciar esta página.</p>
          <Link href={business.publicPath} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-red-700 shadow-sm">
            Voltar para a página pública
          </Link>
        </div>
      </ContentColumn>
    );
  }

  return (
    <ContentColumn size="reading" className="animate-in bg-white pb-24 fade-in duration-500 sm:my-4 sm:overflow-hidden sm:rounded-card sm:border sm:border-slate-200">
      {managementMode ? (
        <div className="space-y-4 border-b border-slate-200 bg-slate-50 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-500">Centro do Negócio</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Gerenciar {business.name}</h1>
              <p className="mt-1 text-sm text-slate-500">Edite sua página, acompanhe publicações e promova o negócio.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={business.publicPath} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700">
                <ExternalLink size={15} />
                Ver página pública
              </Link>
              <button type="button" onClick={() => handleOpenEditModal('info')} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-brand-500 px-4 text-xs font-bold text-white">
                <PencilLine size={15} />
                Editar perfil
              </button>
            </div>
          </div>
          <PublicLinksBlock links={[{ id: business.id, label: business.name, path: business.publicPath }]} />
        </div>
      ) : null}
      <div className={`relative h-72 ${isPendingReview ? 'grayscale' : ''}`}>
        <img src={business.imageUrl} className="h-full w-full object-cover" alt={business.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {business.canEdit && managementMode ? (
          <button
            type="button"
            onClick={() => handleOpenEditModal('media')}
            className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
            aria-label="Editar capa e galeria"
          >
            <PencilLine size={18} />
          </button>
        ) : null}

        <div className="absolute right-4 top-4 flex gap-2">
          <button
            type="button"
            onClick={() => void handleFavoriteToggle()}
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm backdrop-blur transition ${
              business.isFavorite ? 'bg-red-600 text-white' : 'bg-surface text-foreground hover:bg-brand-100'
            }`}
            aria-label="Favoritar negócio"
          >
            <Heart size={19} fill={business.isFavorite ? 'currentColor' : 'none'} />
          </button>

          <button
            type="button"
            onClick={() => void handleShare()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-foreground transition hover:bg-brand-100"
            aria-label="Compartilhar negocio"
          >
            <Share2 size={19} />
          </button>
        </div>

        <div className="absolute bottom-6 left-5 right-5">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white backdrop-blur-sm">
              {business.category}
            </div>

            {business.canEdit && managementMode ? (
              <button
                type="button"
                onClick={() => handleOpenEditModal('info')}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
                aria-label="Editar informações"
              >
                <PencilLine size={15} />
              </button>
            ) : null}
          </div>

          <h1 className="mt-3 text-3xl font-bold leading-tight text-white">{business.name}</h1>
          <p className="mt-2 text-sm text-white/85">{business.locationLabel}</p>
        </div>
      </div>

      <div className="space-y-8 px-5 pt-8">
        {isPendingReview ? (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
            Este negócio está aguardando aprovação e fica visível apenas para você e administradores.
          </div>
        ) : null}

        <div className="rounded-[24px] border border-brand-100 bg-brand-50/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm">
              <BadgeCheck size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">Página do negócio na comunidade</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">Conheça os serviços, veja avaliações de membros e fale diretamente com o responsável.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {callHref ? <a href={callHref} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white px-3 text-xs font-bold text-slate-700 shadow-sm"><Phone size={14} />Ligar</a> : null}
            {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white px-3 text-xs font-bold text-emerald-700 shadow-sm"><MessageCircle size={14} />WhatsApp</a> : null}
            <button type="button" onClick={() => void handleShare()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white px-3 text-xs font-bold text-slate-700 shadow-sm"><Share2 size={14} />Compartilhar</button>
            <button type="button" onClick={() => void handleFavoriteToggle()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white px-3 text-xs font-bold text-slate-700 shadow-sm"><Heart size={14} fill={business.isFavorite ? 'currentColor' : 'none'} />{business.isFavorite ? 'Salvo' : 'Salvar'}</button>
          </div>
          {business.canEdit && managementMode && business.status === 'PUBLISHED' ? (
            <Link href={`/ads/promover/${business.id}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 text-sm font-bold text-white shadow-sm">
              <Megaphone size={17} />
              Promover este negócio com Ads
            </Link>
          ) : business.canEdit && !managementMode ? (
            <Link href={`/negocios/${business.slug || business.id}/gerenciar`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 text-sm font-bold text-white shadow-sm">
              <PencilLine size={17} />
              Gerenciar página do negócio
            </Link>
          ) : null}
        </div>

        <section className="space-y-4 border-b border-slate-100 pb-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="theme-text inline-flex items-center gap-2 text-sm font-bold">
                <Globe2 size={16} />
                Página pública
              </div>
              <p className="break-all text-sm text-slate-600">{publicUrl}</p>
              <p className="text-xs text-slate-400">Página administrada por {business.createdByName}</p>
            </div>

            <button
              type="button"
              onClick={() => void handleCopyUrl()}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
            >
              <Copy size={14} />
              Copiar
            </button>
          </div>

          <div className="pt-1">
            <StarRating
              average={business.ratingAverage}
              count={business.ratingCount}
              viewerRating={business.viewerRating}
              interactive={business.canRate && business.viewerRating === null}
              disabled={!business.canRate || business.viewerRating !== null}
              onRate={(stars) => void handleRateBusiness(stars)}
            />

            {!business.canRate ? (
              <p className="mt-2 text-xs font-medium text-slate-500">
                Proprietários e administradores não podem avaliar este negócio.
              </p>
            ) : business.viewerRating ? (
              <p className="mt-2 text-xs font-medium text-slate-500">
                Sua avaliação já foi registrada com {business.viewerRating} estrela
                {business.viewerRating > 1 ? 's' : ''}.
              </p>
            ) : (
              <p className="mt-2 text-xs font-medium text-slate-500">
                Cada usuário pode avaliar este negócio uma única vez.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4 border-b border-slate-100 pb-7">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
              Contato
            </div>

            {business.canEdit && managementMode ? (
              <button
                type="button"
                onClick={() => handleOpenEditModal('contact')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Editar contato"
              >
                <PencilLine size={17} />
              </button>
            ) : null}
          </div>

          {business.phone ? (
            <a href={callHref || undefined} className="flex items-center gap-4">
              <div className="theme-icon-surface flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                <Phone size={19} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Telefone</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{business.phone}</p>
              </div>
            </a>
          ) : null}

          {business.whatsapp ? (
            <a
              href={whatsappHref || undefined}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <MessageCircle size={19} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">WhatsApp</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{business.whatsapp}</p>
              </div>
            </a>
          ) : null}
        </section>

        <section className="space-y-3 border-b border-slate-100 pb-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
              <MapPin size={16} />
              Endereço
            </div>

            {business.canEdit && managementMode ? (
              <button
                type="button"
                onClick={() => handleOpenEditModal('info')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Editar informações"
              >
                <PencilLine size={17} />
              </button>
            ) : null}
          </div>

          <p className="theme-text text-base font-bold">{business.address}</p>
          <p className="text-sm leading-relaxed text-slate-600">{business.description}</p>

          {business.website || business.instagram ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {business.website ? (
                <a
                  href={business.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  <Globe2 size={14} />
                  Website
                </a>
              ) : null}

              {business.instagram ? (
                <a
                  href={`https://instagram.com/${business.instagram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  <Instagram size={14} />
                  {business.instagram}
                </a>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="space-y-4 pb-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
              <Images size={16} />
              Galeria
            </div>

            {business.canEdit && managementMode ? (
              <button
                type="button"
                onClick={() => handleOpenEditModal('media')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Editar galeria"
              >
                <PencilLine size={17} />
              </button>
            ) : null}
          </div>

          {galleryImages.length === 0 ? (
            <div className="rounded-3xl bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-500">
              Nenhuma imagem adicional cadastrada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {galleryImages.map((imageUrl, index) => (
                <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-[24px] bg-slate-50">
                  <img
                    src={imageUrl}
                    className="aspect-square w-full object-cover"
                    alt={`${business.name} - imagem ${index + 1}`}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="px-5 pb-8">
        <BusinessPostsPanel businessId={business.id} businessName={business.name} management={managementMode} />
      </div>

      {isEditModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseEditModal();
            }
          }}
        >
          <div className="animate-in w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl fade-in zoom-in duration-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <div className="theme-text inline-flex items-center gap-2 text-sm font-bold">
                  <PencilLine size={16} />
                  Editar negocio
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Atualize apenas as informacoes basicas exibidas na pagina.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseEditModal}
                disabled={savingBusiness}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-60"
                aria-label="Fechar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2 border-b border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setEditModalTab('info')}
                className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                  editModalTab === 'info'
                    ? 'theme-bg theme-shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Informações
              </button>

              <button
                type="button"
                onClick={() => setEditModalTab('contact')}
                className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                  editModalTab === 'contact'
                    ? 'theme-bg theme-shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Contato
              </button>

              <button
                type="button"
                onClick={() => setEditModalTab('media')}
                className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                  editModalTab === 'media'
                    ? 'theme-bg theme-shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Imagens
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-5">
              {editModalTab === 'info' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Nome
                    </label>
                    <input
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value)}
                      className="w-full rounded-full border border-input bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-brand-500"
                      placeholder="Nome do negocio"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Categoria
                    </label>
                    <input
                      value={categoryDraft}
                      onChange={(event) => setCategoryDraft(event.target.value)}
                      className="w-full rounded-full border border-input bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-brand-500"
                      placeholder="Categoria"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Endereço
                    </label>
                    <AddressAutocomplete value={addressDraft} onChange={setAddressDraft} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Descricao
                    </label>
                    <textarea
                      value={descriptionDraft}
                      maxLength={600}
                      onChange={(event) => setDescriptionDraft(event.target.value)}
                      rows={5}
                      className="w-full resize-none rounded-md border border-input bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-brand-500"
                      placeholder="Descricao do negocio"
                    />
                    <div className="flex justify-end"><CharacterCounter current={descriptionDraft.length} max={600} /></div>
                  </div>
                </>
              ) : null}

              {editModalTab === 'contact' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Telefone
                    </label>
                    <input
                      value={phoneDraft}
                      onChange={(event) => setPhoneDraft(event.target.value)}
                      className="w-full rounded-full border border-input bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-brand-500"
                      placeholder="Telefone"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      WhatsApp
                    </label>
                    <input
                      value={whatsappDraft}
                      onChange={(event) => setWhatsappDraft(event.target.value)}
                      className="w-full rounded-full border border-input bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-brand-500"
                      placeholder="WhatsApp"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Website
                    </label>
                    <input
                      value={websiteDraft}
                      onChange={(event) => setWebsiteDraft(event.target.value)}
                      className="w-full rounded-full border border-input bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-brand-500"
                      placeholder="https://site.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Instagram
                    </label>
                    <input
                      value={instagramDraft}
                      onChange={(event) => setInstagramDraft(event.target.value)}
                      className="w-full rounded-full border border-input bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-brand-500"
                      placeholder="@instagram"
                    />
                  </div>
                </>
              ) : null}

              {editModalTab === 'media' ? (
                <>
                  <CloudinaryImageField
                    value={coverDraft}
                    onChange={setCoverDraft}
                    folder="businesses"
                    placeholder="Link da imagem de capa"
                    hint="Essa imagem aparece no topo da página do negócio."
                  />

                  <ImageGalleryField
                    value={galleryDraft}
                    onChange={setGalleryDraft}
                    folder="businesses"
                    hint="Use a galeria para mostrar ambiente, produtos e serviços."
                  />
                </>
              ) : null}
            </div>

            <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => void handleSaveBusiness()}
                disabled={savingBusiness}
                className="theme-bg theme-shadow flex-1 rounded-full px-4 py-3 text-sm font-bold disabled:opacity-60"
              >
                {savingBusiness ? 'Salvando...' : 'Salvar alteracoes'}
              </button>

              <button
                type="button"
                onClick={handleCloseEditModal}
                disabled={savingBusiness}
                className="rounded-full bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ContentColumn>
  );
};

export default BusinessDetail;
