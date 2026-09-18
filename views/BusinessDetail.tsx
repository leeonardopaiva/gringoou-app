import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Copy,
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
import { normalizeUrlFieldValue } from '../lib/forms/validation';
import { User } from '../types';
import { ContentColumn } from '../components/ui/ContentColumn';
import { CharacterCounter } from '../components/ui/CharacterCounter';

interface BusinessDetailProps {
  businessId?: string;
  user: User;
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
  name: 'Negocio local',
  description: 'Os detalhes deste negocio ainda nao foram carregados.',
  address: 'Endereco indisponivel',
  category: 'Negocio',
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

const BusinessDetail: React.FC<BusinessDetailProps> = ({ businessId, user }) => {
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
          throw new Error(payload?.error ?? 'Negocio nao encontrado.');
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
          showToast(error instanceof Error ? error.message : 'Nao foi possivel carregar o negocio.', 'error');
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
      showToast('Link do negocio copiado.', 'success');
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
        showToast(payload?.error ?? 'Nao foi possivel salvar as alteracoes.', 'error');
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
      showToast('Negocio atualizado com sucesso.', 'success');
    } catch (error) {
      console.error('Failed to save business:', error);
      showToast('Nao foi possivel salvar as alteracoes.', 'error');
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

  return (
    <ContentColumn size="reading" className="animate-in bg-white pb-24 fade-in duration-500 sm:my-4 sm:overflow-hidden sm:rounded-card sm:border sm:border-slate-200">
      <div className={`relative h-72 ${isPendingReview ? 'grayscale' : ''}`}>
        <img src={business.imageUrl} className="h-full w-full object-cover" alt={business.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {business.canEdit ? (
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
            aria-label="Favoritar negocio"
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

            {business.canEdit ? (
              <button
                type="button"
                onClick={() => handleOpenEditModal('info')}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
                aria-label="Editar informacoes"
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
            Este negocio esta aguardando aprovacao e fica visivel apenas para voce e administradores.
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
          {business.canEdit && business.status === 'PUBLISHED' ? (
            <Link href={`/ads/promover/${business.id}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 text-sm font-bold text-white shadow-sm">
              <Megaphone size={17} />
              Promover este negócio com Ads
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

            {business.canEdit ? (
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

            {business.canEdit ? (
              <button
                type="button"
                onClick={() => handleOpenEditModal('info')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Editar informacoes"
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

            {business.canEdit ? (
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
                Informacoes
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
                      Endereco
                    </label>
                    <input
                      value={addressDraft}
                      onChange={(event) => setAddressDraft(event.target.value)}
                      className="w-full rounded-full border border-input bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-brand-500"
                      placeholder="Endereco"
                    />
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
                    hint="Essa imagem aparece no topo da pagina do negocio."
                  />

                  <ImageGalleryField
                    value={galleryDraft}
                    onChange={setGalleryDraft}
                    folder="businesses"
                    hint="Use a galeria para mostrar ambiente, produtos e servicos."
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
