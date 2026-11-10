import React, { useEffect, useState } from 'react';
import { formatLoosePhoneInput, isValidPhone } from '../lib/forms/phone';
import { ImageEditMenu } from '@/components/ui/ImageEditMenu';
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
  MoreHorizontal,
  PencilLine,
  Phone,
  Share2,
  X,
  Send,
} from 'lucide-react';
import PageHeader from '../components/navigation/PageHeader';
import StarRating from '../components/engagement/StarRating';
import { useToast } from '../components/feedback/ToastProvider';
import CloudinaryImageField from '../components/forms/CloudinaryImageField';
import ImageGalleryField from '../components/forms/ImageGalleryField';
import AddressAutocomplete from '../components/forms/AddressAutocomplete';
import { normalizeUrlFieldValue } from '../lib/forms/validation';
import { User } from '../types';
import { ContentColumn } from '../components/ui/ContentColumn';
import { CharacterCounter } from '../components/ui/CharacterCounter';
import { BusinessPostsPanel } from '../components/business/BusinessPostsPanel';
import { ImageLightbox } from '../components/community/ImageLightbox';
import { notifyContentUpdated } from '../lib/content-refresh';
import { Dropdown } from '../components/ui/Dropdown';
import { useMessaging } from '../lib/MessagingProvider';
import { withUtm } from '@/lib/utm-client';

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
  /** Id da pessoa dona do negócio (destino das mensagens). */
  ownerId: string;
  isOwner: boolean;
  canEdit: boolean;
  publicPath: string;
  status: string;
  ownershipVerifiedAt?: string | null;
};

const defaultBusiness: BusinessDetailState = {
  id: '',
  slug: '',
  name: 'Negócio local',
  description: 'Os detalhes deste negócio ainda não foram carregados.',
  address: 'Endereço indisponível',
  category: 'Negócio',
  imageUrl: '',
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
  ownerId: '',
  isOwner: false,
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

const GALLERY_PREVIEW_LIMIT = 8;

const BusinessDetail: React.FC<BusinessDetailProps> = ({ businessId, user, managementMode = false }) => {
  const { showToast } = useToast();
  const { startDirectConversation } = useMessaging();

  const [business, setBusiness] = useState<BusinessDetailState>(defaultBusiness);
  const [loading, setLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalTab, setEditModalTab] = useState<EditModalTab>('info');
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [contacting, setContacting] = useState(false);

  const [nameDraft, setNameDraft] = useState('');
  const [slugDraft, setSlugDraft] = useState('');
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
            ownerId: payload.business.createdById || '',
            isOwner: Boolean(payload.business.isOwner),
            canEdit: Boolean(payload.business.canEdit),
            publicPath: payload.business.publicPath || `/businesses/${payload.business.slug || payload.business.id}`,
            status: payload.business.status || 'PUBLISHED',
            ownershipVerifiedAt: payload.business.ownershipVerifiedAt || null,
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
    setSlugDraft(source.slug);
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
      withUtm('share_business', business.publicPath, { id: business.id });

    try {
      await navigator.clipboard.writeText(publicUrl);
      showToast('Link do negócio copiado.', 'success');
    } catch {
      showToast(publicUrl, 'info', 5000);
    }
  };

  const handleShare = async () => {
    const publicUrl =
      withUtm('share_business', business.publicPath, { id: business.id });

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
    if ((phoneDraft.trim() && !isValidPhone(phoneDraft)) || (whatsappDraft.trim() && !isValidPhone(whatsappDraft))) {
      showToast('Informe telefone e WhatsApp válidos, com DDD ou código do país.', 'error');
      return;
    }
    setSavingBusiness(true);

    try {
      const response = await fetch(`/api/businesses/${business.slug || business.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: nameDraft.trim(),
          slug: slugDraft.trim(),
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
        slug: payload.business.slug,
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
      notifyContentUpdated();
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showAllGallery, setShowAllGallery] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const mapQuery = encodeURIComponent(business.address || business.locationLabel);
  const isPendingReview = business.status === 'PENDING_REVIEW';

  if (loading) {
    return (
      <ContentColumn size="compact" className="animate-in space-y-5 pb-6 fade-in duration-500">
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
      <ContentColumn size="compact" className="pb-8">
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
    <ContentColumn size="compact" className="animate-in pb-24 fade-in duration-500">
      <PageHeader title="Negócios" backHref="/businesses" historyBack />
      <div className="overflow-hidden bg-white sm:rounded-card">
      {managementMode ? (
        <div className="flex items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-1.5 sm:px-6">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800"><BadgeCheck size={14} aria-hidden /> Você gerencia esta página</p>
          <Dropdown
            align="right"
            trigger={<span className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-800 transition hover:bg-emerald-100"><MoreHorizontal size={18} /></span>}
            sections={[{ heading: 'Ações do negócio', items: [
              { label: 'Ver página pública', icon: <ExternalLink size={16} />, onClick: () => window.location.assign(business.publicPath) },
              { label: 'Editar informações', icon: <PencilLine size={16} />, onClick: () => handleOpenEditModal('info') },
              { label: 'Editar imagens', icon: <Images size={16} />, onClick: () => handleOpenEditModal('media') },
              { label: 'Editar contato', icon: <Phone size={16} />, onClick: () => handleOpenEditModal('contact') },
              ...(business.status === 'PUBLISHED' ? [{ label: 'Promover com Ads', icon: <Megaphone size={16} />, onClick: () => window.location.assign(`/ads/promover/${business.id}`) }] : []),
            ] }]}
          />

        </div>
      ) : null}
      <div className={`relative h-56 overflow-hidden bg-gradient-to-br from-[#004380] via-[#0065bf] to-[#66b6ff] sm:h-64 ${isPendingReview ? 'grayscale' : ''}`}>
        {business.canEdit ? (
          <ImageEditMenu
            folder="businesses"
            kind="cover"
            src={business.imageUrl}
            className="bottom-3 right-3"
            onUploaded={async (url) => {
              const response = await fetch(`/api/businesses/${business.slug || business.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: url }) });
              const payload = await response.json().catch(() => null);
              if (!response.ok) return payload?.error ?? 'Não foi possível atualizar a capa.';
              setCoverFailed(false);
              setBusiness((current) => ({ ...current, imageUrl: payload.business.imageUrl || current.imageUrl }));
              notifyContentUpdated();
              showToast('Capa atualizada.', 'success');
            }}
          />
        ) : null}
        {business.imageUrl && !coverFailed ? (
          <img src={business.imageUrl} className="h-full w-full object-cover" alt="" onError={() => setCoverFailed(true)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center" aria-hidden>
            <span className="text-6xl font-extrabold text-white/30">{business.name.trim().charAt(0).toUpperCase() || 'N'}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
        <div className="absolute right-4 top-4 flex gap-2">
          <button
            type="button"
            onClick={() => void handleFavoriteToggle()}
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm backdrop-blur transition ${
              business.isFavorite ? 'bg-red-600 text-white' : 'bg-white/90 text-slate-700 hover:bg-white'
            }`}
            aria-label="Favoritar negócio"
          >
            <Heart size={19} fill={business.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
            aria-label="Compartilhar negócio"
          >
            <Share2 size={19} />
          </button>
        </div>
      </div>

      <div className="space-y-7 px-5 pb-2 pt-6 sm:px-7">
        {isPendingReview ? (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
            Este negócio está aguardando aprovação e fica visível apenas para você e administradores.
          </div>
        ) : null}

        <header className="space-y-3">
          <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">{business.category}</span>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <h1 className="flex items-center gap-2 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                <span className="min-w-0 break-words">{business.name}</span>
                {business.ownershipVerifiedAt ? <BadgeCheck size={22} className="shrink-0 text-brand-500" aria-label="Propriedade verificada pela equipe" /> : null}
              </h1>
              <p className="flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={15} className="shrink-0 text-slate-400" aria-hidden />{business.locationLabel}</p>
            </div>
            {business.canEdit && !managementMode ? (
              <Link
                href={`/businesses/${business.slug || business.id}/gerenciar`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <PencilLine size={14} /> Gerenciar
              </Link>
            ) : null}
          </div>
          <StarRating
            average={business.ratingAverage}
            count={business.ratingCount}
            viewerRating={business.viewerRating}
            interactive={business.canRate && business.viewerRating === null}
            disabled={!business.canRate || business.viewerRating !== null}
            onRate={(stars) => void handleRateBusiness(stars)}
          />
        </header>

        {/* Ações de contato: a principal ocupa o espaço, as demais são ícones. */}
        <div className="flex items-stretch gap-2.5">
          {!business.isOwner && business.ownerId ? (
            <button
              type="button"
              onClick={() => {
                setContacting(true);
                startDirectConversation(business.ownerId, { type: 'business', id: business.id });
              }}
              disabled={contacting}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MessageCircle size={18} />
              {contacting ? 'Abrindo conversa...' : 'Falar com o negócio'}
            </button>
          ) : business.isOwner ? (
            <Link href="/ads/inbox" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-105">
              <MessageCircle size={18} />
              Ver mensagens do negócio
            </Link>
          ) : null}
          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noreferrer" aria-label="Conversar no WhatsApp" title="WhatsApp" className="inline-flex min-h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-emerald-600 transition hover:bg-emerald-50">
              <Send size={18} />
            </a>
          ) : null}
          {callHref ? (
            <a href={callHref} aria-label="Ligar" title="Ligar" className="inline-flex min-h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50">
              <Phone size={18} />
            </a>
          ) : null}
        </div>

        {business.description ? (
          <section aria-label="Sobre o negócio">
            <h2 className="text-base font-bold text-slate-900">Sobre</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{business.description}</p>
          </section>
        ) : null}

        <section aria-label="Informações de contato" className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-4">
          {business.address ? (
            <div className="flex items-start gap-3 py-3.5">
              <MapPin size={18} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{business.address}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-brand-600">
                  <a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noreferrer" className="hover:underline">Google Maps</a>
                  <a href={`https://waze.com/ul?q=${mapQuery}&navigate=yes`} target="_blank" rel="noreferrer" className="hover:underline">Waze</a>
                </div>
              </div>
            </div>
          ) : null}
          {business.phone ? (
            <a href={callHref || undefined} className="flex items-center gap-3 py-3.5 text-sm font-semibold text-slate-800 hover:text-brand-600">
              <Phone size={18} className="shrink-0 text-brand-500" aria-hidden />
              {business.phone}
            </a>
          ) : null}
          {business.whatsapp ? (
            <a href={whatsappHref || undefined} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-3.5 text-sm font-semibold text-slate-800 hover:text-emerald-700">
              <MessageCircle size={18} className="shrink-0 text-emerald-600" aria-hidden />
              {business.whatsapp}
            </a>
          ) : null}
          {business.website ? (
            <a href={business.website} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-3.5 text-sm font-semibold text-slate-800 hover:text-brand-600">
              <Globe2 size={18} className="shrink-0 text-brand-500" aria-hidden />
              <span className="truncate">{business.website.replace(/^https?:\/\//, '')}</span>
            </a>
          ) : null}
          {business.instagram ? (
            <a href={`https://instagram.com/${business.instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-3.5 text-sm font-semibold text-slate-800 hover:text-brand-600">
              <Instagram size={18} className="shrink-0 text-brand-500" aria-hidden />
              {business.instagram}
            </a>
          ) : null}
        </section>

        {galleryImages.length > 0 ? (
          <section aria-label="Galeria" className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Fotos</h2>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {(showAllGallery ? galleryImages : galleryImages.slice(0, GALLERY_PREVIEW_LIMIT)).map((imageUrl, index) => {
                const hiddenCount = galleryImages.length - GALLERY_PREVIEW_LIMIT;
                const isMoreTile = !showAllGallery && hiddenCount > 0 && index === GALLERY_PREVIEW_LIMIT - 1;
                return (
                  <button
                    key={`${imageUrl}-${index}`}
                    type="button"
                    onClick={() => (isMoreTile ? setShowAllGallery(true) : setSelectedImage(imageUrl))}
                    className="relative overflow-hidden rounded-xl bg-slate-100"
                    aria-label={isMoreTile ? `Ver mais ${hiddenCount + 1} imagens` : `Ampliar imagem ${index + 1}`}
                  >
                    <img src={imageUrl} loading="lazy" className="aspect-square w-full object-cover" alt={`${business.name} - imagem ${index + 1}`} />
                    {isMoreTile ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-slate-900/55 text-sm font-bold text-white">+{hiddenCount + 1}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span>Página administrada por {business.createdByName}</span>
          {managementMode ? (
            <button type="button" onClick={() => void handleCopyUrl()} className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-slate-700">
              <Copy size={13} /> Copiar link da página
            </button>
          ) : null}
        </p>
      </div>

      <div className="px-5 pb-8 sm:px-7">
        <BusinessPostsPanel businessId={business.id} businessName={business.name} management={managementMode} />
      </div>
      <ImageLightbox open={Boolean(selectedImage)} onClose={() => setSelectedImage(null)} src={selectedImage || ''} alt={`Imagem de ${business.name}`} />

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

            <div className="max-h-[70dvh] space-y-5 overflow-y-auto px-5 py-5">
              {editModalTab === 'info' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
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
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">URL da página</label>
                    <div className="flex overflow-hidden rounded-full border border-input bg-surface text-sm">
                      <span className="shrink-0 px-4 py-3 text-slate-400">/businesses/</span>
                      <input value={slugDraft} onChange={(event) => setSlugDraft(event.target.value)} className="min-w-0 flex-1 bg-transparent py-3 pr-4 font-medium text-foreground outline-none" placeholder="trustapizzashop" />
                    </div>
                    <p className="text-xs text-slate-500">Use letras, números e hífens. Links antigos continuarão funcionando.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
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
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Endereço
                    </label>
                    <AddressAutocomplete value={addressDraft} onChange={setAddressDraft} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
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
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Telefone
                    </label>
                    <input
                      value={phoneDraft}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={24}
                      onChange={(event) => setPhoneDraft(formatLoosePhoneInput(event.target.value))}
                      className="w-full rounded-full border border-input bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-brand-500"
                      placeholder="Telefone"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      WhatsApp
                    </label>
                    <input
                      value={whatsappDraft}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={24}
                      onChange={(event) => setWhatsappDraft(formatLoosePhoneInput(event.target.value))}
                      className="w-full rounded-full border border-input bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-brand-500"
                      placeholder="WhatsApp"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
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
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
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
      </div>
    </ContentColumn>
  );
};

export default BusinessDetail;
