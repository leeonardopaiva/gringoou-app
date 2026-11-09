import React, { useEffect, useState } from 'react';
import { EmptyNotice } from '@/components/ui/EmptyNotice';
import { ImageEditMenu } from '@/components/ui/ImageEditMenu';
import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  Copy,
  ExternalLink,
  Globe2,
  Heart,
  Images,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  PencilLine,
  Share2,
  ShieldCheck,
  X,
} from 'lucide-react';
import StarRating from '../components/engagement/StarRating';
import { useToast } from '../components/feedback/ToastProvider';
import CloudinaryImageField from '../components/forms/CloudinaryImageField';
import ImageGalleryField from '../components/forms/ImageGalleryField';
import { normalizeUrlFieldValue } from '../lib/forms/validation';
import { User } from '../types';
import type { EventDetailItem } from '../domain/events/entities/event.entity';
import { ContentColumn } from '../components/ui/ContentColumn';
import { LinkifiedText } from '../components/ui/LinkifiedText';
import { ImageLightbox } from '../components/community/ImageLightbox';
import { notifyContentUpdated } from '../lib/content-refresh';
import { Dropdown } from '../components/ui/Dropdown';
import { BackBar } from '../components/ui/BackBar';
import { useMessaging } from '../lib/MessagingProvider';
import { PublisherSignature } from '../components/ui/PublisherSignature';
import type { Publisher } from '../lib/publisher';
import RegionSelector from '../components/RegionSelector';

interface EventDetailProps {
  eventId?: string;
  user: User;
  initialEvent?: EventDetailItem | null;
}

type EventDetailState = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  venueName: string;
  startsAt: string;
  endsAt: string | null;
  locationLabel: string;
  regionKey: string;
  city: string;
  state: string;
  externalUrl: string;
  imageUrl: string;
  galleryUrls: string[];
  ratingAverage: number;
  ratingCount: number;
  viewerRating: number | null;
  isFavorite: boolean;
  canRate: boolean;
  createdByName: string;
  publisher?: Publisher | null;
  organizerId?: string | null;
  isOwner?: boolean;
  canEdit: boolean;
  publicPath: string;
  status: string;
  ownershipVerifiedAt?: string | null;
};

const defaultEvent: EventDetailState = {
  id: '',
  slug: '',
  title: 'Evento da comunidade',
  category: 'Outros',
  description: 'Os detalhes deste evento ainda nao foram carregados.',
  venueName: 'Local a definir',
  startsAt: new Date().toISOString(),
  endsAt: null,
  locationLabel: '',
  regionKey: '',
  city: '',
  state: '',
  externalUrl: '',
  imageUrl: '',
  galleryUrls: [],
  ratingAverage: 0,
  ratingCount: 0,
  viewerRating: null,
  isFavorite: false,
  canRate: false,
  createdByName: 'Comunidade Gringoou',
  canEdit: false,
  publicPath: '',
  status: 'PUBLISHED',
};

const formatEventDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const toDateTimeLocal = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

type EventDetailsDraft = Pick<EventDetailState, 'title' | 'description' | 'venueName' | 'category' | 'regionKey' | 'externalUrl'> & {
  startsAt: string;
  endsAt: string;
};

const EventDetail: React.FC<EventDetailProps> = ({ eventId, user, initialEvent }) => {
  const { showToast } = useToast();
  const { startDirectConversation } = useMessaging();
  const initialState: EventDetailState = initialEvent
    ? {
        id: initialEvent.id,
        slug: initialEvent.slug,
        title: initialEvent.title,
        category: initialEvent.category || 'Outros',
        description: initialEvent.description || defaultEvent.description,
        venueName: initialEvent.venueName,
        startsAt: initialEvent.startsAt,
        endsAt: initialEvent.endsAt || null,
        locationLabel: initialEvent.locationLabel || '',
        regionKey: initialEvent.regionKey || '',
        city: initialEvent.city || '',
        state: initialEvent.state || '',
        externalUrl: initialEvent.externalUrl || '',
        imageUrl: initialEvent.imageUrl || defaultEvent.imageUrl,
        galleryUrls: Array.isArray(initialEvent.galleryUrls) ? initialEvent.galleryUrls : [],
        ratingAverage: Number(initialEvent.ratingAverage ?? 0),
        ratingCount: Number(initialEvent.ratingCount ?? 0),
        viewerRating: initialEvent.viewerRating ?? null,
        isFavorite: Boolean(initialEvent.isFavorite),
        canRate: Boolean(initialEvent.canRate),
        createdByName: initialEvent.createdByName || 'Comunidade Gringoou',
        publisher: (initialEvent as { publisher?: Publisher | null }).publisher ?? null,
        organizerId: (initialEvent as { organizerId?: string | null }).organizerId ?? null,
        isOwner: Boolean((initialEvent as { isOwner?: boolean }).isOwner),
        canEdit: Boolean(initialEvent.canEdit),
        publicPath: initialEvent.publicPath || `/events/${initialEvent.slug || initialEvent.id}`,
        status: initialEvent.status || 'PUBLISHED',
        ownershipVerifiedAt: initialEvent.ownershipVerifiedAt || null,
      }
    : defaultEvent;
  const [event, setEvent] = useState<EventDetailState>(initialState);
  const [loading, setLoading] = useState(!initialEvent);
  const [editingMedia, setEditingMedia] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState<EventDetailsDraft>({
    title: '', description: '', venueName: '', category: 'Outros', regionKey: '', externalUrl: '', startsAt: '', endsAt: '',
  });
  const [savingMedia, setSavingMedia] = useState(false);
  const [coverDraft, setCoverDraft] = useState('');
  const [galleryDraft, setGalleryDraft] = useState<string[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    // Se initialEvent foi fornecido, não faz fetch inicial — monta direto
    if (initialEvent) {
      return;
    }

    let ignore = false;

    const fetchEvent = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`/api/events/${eventId}`);
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Evento nao encontrado.');
        }

        if (!ignore) {
          const nextEvent: EventDetailState = {
            id: payload.event.id,
            slug: payload.event.slug,
            title: payload.event.title,
            category: payload.event.category || 'Outros',
            description: payload.event.description || defaultEvent.description,
            venueName: payload.event.venueName,
            startsAt: payload.event.startsAt,
            endsAt: payload.event.endsAt || null,
            locationLabel: payload.event.locationLabel || '',
            regionKey: payload.event.regionKey || '',
            city: payload.event.city || '',
            state: payload.event.state || '',
            externalUrl: payload.event.externalUrl || '',
            imageUrl: payload.event.imageUrl || defaultEvent.imageUrl,
            galleryUrls: Array.isArray(payload.event.galleryUrls) ? payload.event.galleryUrls : [],
            ratingAverage: Number(payload.event.ratingAverage ?? 0),
            ratingCount: Number(payload.event.ratingCount ?? 0),
            viewerRating: payload.event.viewerRating ?? null,
            isFavorite: Boolean(payload.event.isFavorite),
            canRate: Boolean(payload.event.canRate),
            createdByName: payload.event.createdByName || payload.event.createdBy?.name || 'Comunidade Gringoou',
            publisher: payload.event.publisher ?? null,
            organizerId: payload.event.organizerId ?? null,
            isOwner: Boolean(payload.event.isOwner),
            canEdit: Boolean(payload.event.canEdit),
            publicPath: payload.event.publicPath || `/events/${payload.event.slug || payload.event.id}`,
            status: payload.event.status || 'PUBLISHED',
            ownershipVerifiedAt: payload.event.ownershipVerifiedAt || null,
          };

          setEvent(nextEvent);
          setCoverDraft(nextEvent.imageUrl);
          setGalleryDraft(nextEvent.galleryUrls);
        }
      } catch (error) {
        console.error('Failed to load event detail:', error);
        if (!ignore) {
          showToast(error instanceof Error ? error.message : 'Nao foi possivel carregar o evento.', 'error');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void fetchEvent();

    return () => {
      ignore = true;
    };
  }, [eventId, showToast, initialEvent]);

  const publicUrl =
    typeof window === 'undefined'
      ? event.publicPath
      : `${window.location.origin}${event.publicPath}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      showToast('Link do evento copiado.', 'success');
    } catch {
      showToast(publicUrl, 'info', 5000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description,
          url: publicUrl,
        });
        return;
      } catch {
        return;
      }
    }

    await handleCopyUrl();
  };

  // Deep link vindo do menu do card (?editar=info|imagens): abre o editor correspondente uma única vez.
  const deepLinkHandled = React.useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current || !event.canEdit || typeof window === 'undefined') return;
    const mode = new URLSearchParams(window.location.search).get('editar');
    if (!mode) return;
    deepLinkHandled.current = true;
    window.history.replaceState(null, '', window.location.pathname);
    if (mode === 'imagens') {
      setCoverDraft(event.imageUrl);
      setGalleryDraft(event.galleryUrls);
      setEditingMedia(true);
    } else if (mode === 'info') {
      openDetailsEditor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.canEdit]);

  const openDetailsEditor = () => {
    setDetailsDraft({
      title: event.title,
      description: event.description,
      venueName: event.venueName,
      category: event.category,
      regionKey: event.regionKey,
      externalUrl: event.externalUrl,
      startsAt: toDateTimeLocal(event.startsAt),
      endsAt: toDateTimeLocal(event.endsAt),
    });
    setEditingDetails(true);
  };

  const handleSaveDetails = async () => {
    if (!detailsDraft.title.trim() || !detailsDraft.description.trim() || !detailsDraft.venueName.trim() || !detailsDraft.regionKey || !detailsDraft.startsAt) {
      showToast('Preencha os campos obrigatorios do evento.', 'error');
      return;
    }

    setSavingDetails(true);
    try {
      const response = await fetch(`/api/events/${event.slug || event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...detailsDraft,
          startsAt: new Date(detailsDraft.startsAt).toISOString(),
          endsAt: detailsDraft.endsAt ? new Date(detailsDraft.endsAt).toISOString() : null,
          externalUrl: normalizeUrlFieldValue(detailsDraft.externalUrl) || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Nao foi possivel atualizar o evento.');

      setEvent((current) => ({
        ...current,
        title: payload.event?.title ?? detailsDraft.title.trim(),
        description: payload.event?.description ?? detailsDraft.description.trim(),
        venueName: payload.event?.venueName ?? detailsDraft.venueName.trim(),
        category: payload.event?.category ?? detailsDraft.category,
        regionKey: payload.event?.regionKey ?? detailsDraft.regionKey,
        locationLabel: payload.event?.locationLabel ?? current.locationLabel,
        startsAt: payload.event?.startsAt ?? new Date(detailsDraft.startsAt).toISOString(),
        endsAt: payload.event?.endsAt ?? (detailsDraft.endsAt ? new Date(detailsDraft.endsAt).toISOString() : null),
        externalUrl: payload.event?.externalUrl ?? normalizeUrlFieldValue(detailsDraft.externalUrl) ?? '',
      }));
      setEditingDetails(false);
      notifyContentUpdated();
      showToast('Informacoes do evento atualizadas.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Nao foi possivel atualizar o evento.', 'error');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleFavoriteToggle = async () => {
    try {
      const response = await fetch(`/api/events/${event.slug || event.id}/favorite`, {
        method: event.isFavorite ? 'DELETE' : 'POST',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showToast(payload?.error ?? 'Nao foi possivel atualizar seus favoritos.', 'error');
        return;
      }

      setEvent((current) => ({
        ...current,
        isFavorite: Boolean(payload?.isFavorite),
      }));
      showToast(
        payload?.isFavorite ? 'Evento adicionado aos favoritos.' : 'Evento removido dos favoritos.',
        'success',
      );
    } catch (error) {
      console.error('Failed to toggle event favorite:', error);
      showToast('Nao foi possivel atualizar seus favoritos.', 'error');
    }
  };

  const handleRateEvent = async (stars: number) => {
    try {
      const response = await fetch(`/api/events/${event.slug || event.id}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stars }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (payload?.viewerRating) {
          setEvent((current) => ({
            ...current,
            viewerRating: payload.viewerRating,
          }));
        }

        showToast(payload?.error ?? 'Nao foi possivel registrar sua avaliacao.', 'error');
        return;
      }

      setEvent((current) => ({
        ...current,
        viewerRating: payload.viewerRating,
        ratingAverage: payload.ratingAverage,
        ratingCount: payload.ratingCount,
      }));
      showToast('Sua avaliacao foi registrada.', 'success');
    } catch (error) {
      console.error('Failed to rate event:', error);
      showToast('Nao foi possivel registrar sua avaliacao.', 'error');
    }
  };

  const handleSaveMedia = async () => {
    setSavingMedia(true);

    try {
      const response = await fetch(`/api/events/${event.slug || event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: normalizeUrlFieldValue(coverDraft),
          galleryUrls: galleryDraft,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showToast(payload?.error ?? 'Nao foi possivel salvar a galeria do evento.', 'error');
        return;
      }

      const nextImageUrl = payload.event.imageUrl || defaultEvent.imageUrl;
      const nextGalleryUrls = Array.isArray(payload.event.galleryUrls) ? payload.event.galleryUrls : [];

      setEvent((current) => ({
        ...current,
        imageUrl: nextImageUrl,
        galleryUrls: nextGalleryUrls,
      }));
      setCoverDraft(nextImageUrl);
      setGalleryDraft(nextGalleryUrls);
      setEditingMedia(false);
      notifyContentUpdated();
      showToast('Capa e galeria do evento atualizadas.', 'success');
    } catch (error) {
      console.error('Failed to save event media:', error);
      showToast('Nao foi possivel salvar a galeria do evento.', 'error');
    } finally {
      setSavingMedia(false);
    }
  };

  const galleryImages = event.galleryUrls.filter(Boolean);
  const cityRegion = [event.city, event.state].filter(Boolean).join(', ');
  const showCityRegion = Boolean(cityRegion && (!event.city || !event.locationLabel.toLocaleLowerCase().includes(event.city.toLocaleLowerCase())));
  const isPendingReview = event.status === 'PENDING_REVIEW';

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

  return (
    <ContentColumn size="compact" className="animate-in pb-24 fade-in duration-500">
      <BackBar fallbackHref="/events" label="Eventos" />
      <div className="overflow-hidden bg-white sm:rounded-card">
        {event.canEdit ? (
          <div className="flex items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-1.5 sm:px-6">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800"><BadgeCheck size={14} aria-hidden /> Você gerencia este evento</p>
            <Dropdown align="right" trigger={<span className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-800 transition hover:bg-emerald-100"><MoreHorizontal size={18} /></span>} sections={[{ heading: 'Ações do evento', items: [
              { label: 'Ver página pública', icon: <ExternalLink size={16} />, onClick: () => window.location.assign(event.publicPath) },
              { label: 'Editar informações', icon: <PencilLine size={16} />, onClick: openDetailsEditor },
              { label: 'Editar galeria', icon: <Images size={16} />, onClick: () => { setCoverDraft(event.imageUrl); setGalleryDraft(event.galleryUrls); setEditingMedia(true); } },
            ] }]} />
          </div>
        ) : null}

        <div className={`relative h-56 overflow-hidden bg-gradient-to-br from-[#004380] via-[#0065bf] to-[#66b6ff] sm:h-64 ${isPendingReview ? 'grayscale' : ''}`}>
          {event.imageUrl && !coverFailed ? (
            <img src={event.imageUrl} className="h-full w-full object-cover" alt="" onError={() => setCoverFailed(true)} />
          ) : (
            <div className="flex h-full items-center justify-center text-white/30" aria-hidden><CalendarDays size={72} /></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
          {event.canEdit ? (
            <ImageEditMenu
              folder="events"
              kind="cover"
              src={event.imageUrl}
              className="bottom-3 right-3"
              onUploaded={async (url) => {
                const response = await fetch(`/api/events/${event.slug || event.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: url }) });
                const payload = await response.json().catch(() => null);
                if (!response.ok) return payload?.error ?? 'Não foi possível atualizar a capa.';
                setCoverFailed(false);
                setEvent((current) => ({ ...current, imageUrl: payload.event?.imageUrl || url }));
                notifyContentUpdated();
                showToast('Capa atualizada.', 'success');
              }}
            />
          ) : null}
          <div className="absolute right-4 top-4 flex gap-2">
            <button
              type="button"
              onClick={() => void handleFavoriteToggle()}
              className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm backdrop-blur transition ${event.isFavorite ? 'bg-red-600 text-white' : 'bg-white/90 text-slate-700 hover:bg-white'}`}
              aria-label="Favoritar evento"
            >
              <Heart size={19} fill={event.isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
              aria-label="Compartilhar evento"
            >
              <Share2 size={19} />
            </button>
          </div>
        </div>

        <div className="space-y-7 px-5 pb-2 pt-6 sm:px-7">
          {isPendingReview ? (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
              Este evento está aguardando aprovação e fica visível apenas para você e administradores.
            </div>
          ) : null}

          <header className="space-y-3">
            <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">{event.category || 'Evento'}</span>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl">
              <span className="min-w-0 break-words">{event.title}</span>
              {event.ownershipVerifiedAt ? <ShieldCheck size={22} className="shrink-0 text-brand-500" aria-label="Evento verificado pela equipe" /> : null}
            </h1>
            <p className="flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={15} className="shrink-0 text-slate-400" aria-hidden />{event.locationLabel}</p>
            <StarRating
              average={event.ratingAverage}
              count={event.ratingCount}
              viewerRating={event.viewerRating}
              interactive={event.canRate && event.viewerRating === null}
              disabled={!event.canRate || event.viewerRating !== null}
              onRate={(stars) => void handleRateEvent(stars)}
              onBlockedClick={() =>
                showToast(
                  !event.canRate
                    ? 'Organizadores e administradores não podem avaliar este evento.'
                    : 'Você já avaliou este evento. Cada pessoa avalia uma única vez.',
                  'info',
                )
              }
            />
          </header>

          {/* Ações: a principal ocupa o espaço, as demais são ícones. */}
          <div className="flex items-stretch gap-2.5">
            {!event.isOwner && event.organizerId ? (
              <button
                type="button"
                onClick={() => startDirectConversation(event.organizerId as string, { type: 'event', id: event.id })}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-105"
              >
                <MessageCircle size={18} aria-hidden />
                Falar com o organizador
              </button>
            ) : null}
            {event.externalUrl ? (
              <a href={event.externalUrl} target="_blank" rel="noreferrer" aria-label="Abrir link do evento" title="Link do evento" className="inline-flex min-h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50">
                <Globe2 size={18} />
              </a>
            ) : null}
            <button type="button" onClick={() => void handleCopyUrl()} aria-label="Copiar link do evento" title="Copiar link" className={`inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 ${!event.isOwner && event.organizerId ? 'w-12' : 'flex-1 gap-2 px-5 text-sm font-bold'}`}>
              <Copy size={18} />
              {!event.isOwner && event.organizerId ? null : 'Copiar link do evento'}
            </button>
          </div>

          <section aria-label="Data e local" className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-4">
            <div className="flex items-start gap-3 py-3.5">
              <CalendarDays size={18} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Início</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatEventDateTime(event.startsAt)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 py-3.5">
              <Clock3 size={18} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Encerramento</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{event.endsAt ? formatEventDateTime(event.endsAt) : 'Não informado'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 py-3.5">
              <MapPin size={18} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Local</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{event.venueName}</p>
                <p className="text-sm text-slate-500">{event.locationLabel}{showCityRegion ? ` · ${cityRegion}` : ''}</p>
              </div>
            </div>
          </section>

          <section aria-label="Sobre o evento">
            <h2 className="text-base font-bold text-slate-900">Sobre o evento</h2>
            <LinkifiedText text={event.description} className="mt-2 block text-sm leading-7 text-slate-600" />
            <PublisherSignature className="mt-4" publisher={event.publisher ?? { name: event.createdByName, image: null, href: null, kind: 'USER' }} />
          </section>

          <section aria-label="Galeria" className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Fotos</h2>
            {galleryImages.length === 0 ? (
              <EmptyNotice title="Sem fotos adicionais" description="O organizador ainda não adicionou fotos." />
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {galleryImages.map((imageUrl, index) => (
                  <button type="button" onClick={() => setLightboxImage(imageUrl)} key={`${imageUrl}-${index}`} className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                    <img src={imageUrl} loading="lazy" className="h-full w-full object-cover" alt={`${event.title} - imagem ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {editingDetails ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center sm:p-6" onClick={(clickEvent) => {
          if (clickEvent.target === clickEvent.currentTarget && !savingDetails) setEditingDetails(false);
        }}>
          <div className="animate-in max-h-[92vh] w-full max-w-xl overflow-hidden rounded-[28px] bg-white shadow-2xl fade-in zoom-in duration-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div><p className="theme-text text-sm font-bold">Editar evento</p><p className="mt-1 text-xs text-slate-500">Atualize as informações exibidas na página pública.</p></div>
              <button type="button" disabled={savingDetails} onClick={() => setEditingDetails(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-label="Fechar modal"><X size={18} /></button>
            </div>
            <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-5">
              <input value={detailsDraft.title} onChange={(input) => setDetailsDraft((current) => ({ ...current, title: input.target.value }))} placeholder="Título do evento" className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none" />
              <textarea rows={4} value={detailsDraft.description} onChange={(input) => setDetailsDraft((current) => ({ ...current, description: input.target.value }))} placeholder="Descrição" className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none" />
              <input value={detailsDraft.venueName} onChange={(input) => setDetailsDraft((current) => ({ ...current, venueName: input.target.value }))} placeholder="Local" className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none" />
              <select value={detailsDraft.category} onChange={(input) => setDetailsDraft((current) => ({ ...current, category: input.target.value }))} className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none">
                {['Cultural', 'Networking', 'Esporte', 'Gastronomia', 'Família', 'Outros'].map((category) => <option key={category}>{category}</option>)}
              </select>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-bold text-slate-500">Início<input type="datetime-local" value={detailsDraft.startsAt} onChange={(input) => setDetailsDraft((current) => ({ ...current, startsAt: input.target.value }))} className="theme-outline-ring block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal text-slate-800 outline-none" /></label>
                <label className="space-y-1 text-xs font-bold text-slate-500">Encerramento<input type="datetime-local" value={detailsDraft.endsAt} onChange={(input) => setDetailsDraft((current) => ({ ...current, endsAt: input.target.value }))} className="theme-outline-ring block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal text-slate-800 outline-none" /></label>
              </div>
              <RegionSelector value={detailsDraft.regionKey} onChange={(region) => setDetailsDraft((current) => ({ ...current, regionKey: region.key }))} label="Região" hint="A página será atualizada para a região selecionada." />
              <input value={detailsDraft.externalUrl} onChange={(input) => setDetailsDraft((current) => ({ ...current, externalUrl: input.target.value }))} placeholder="Link externo (opcional)" className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none" />
            </div>
            <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" disabled={savingDetails} onClick={() => void handleSaveDetails()} className="theme-bg theme-shadow flex-1 rounded-full px-4 py-3 text-sm font-bold disabled:opacity-60">{savingDetails ? 'Salvando...' : 'Salvar alterações'}</button>
              <button type="button" disabled={savingDetails} onClick={() => setEditingDetails(false)} className="rounded-full bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 disabled:opacity-60">Cancelar</button>
            </div>
          </div>
        </div>
      ) : null}

      {editingMedia ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
          onClick={(clickEvent) => {
            if (clickEvent.target === clickEvent.currentTarget && !savingMedia) {
              setEditingMedia(false);
              setCoverDraft(event.imageUrl);
              setGalleryDraft(event.galleryUrls);
            }
          }}
        >
          <div className="animate-in w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl fade-in zoom-in duration-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <div className="theme-text inline-flex items-center gap-2 text-sm font-bold">
                  <PencilLine size={16} />
                  Editar imagens
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {user.role === 'ADMIN'
                    ? 'Atualize a capa e a galeria deste evento como administrador.'
                    : 'Atualize a capa e a galeria exibidas na pagina.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (savingMedia) return;
                  setEditingMedia(false);
                  setCoverDraft(event.imageUrl);
                  setGalleryDraft(event.galleryUrls);
                }}
                disabled={savingMedia}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-60"
                aria-label="Fechar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-5">
              <CloudinaryImageField
                value={coverDraft}
                onChange={setCoverDraft}
                folder="events"
                placeholder="Link da imagem de capa"
                hint="Essa imagem aparece no topo da pagina do evento."
              />
              <ImageGalleryField
                value={galleryDraft}
                onChange={setGalleryDraft}
                folder="events"
                hint="Use a galeria para mostrar ambiente, palestrantes e bastidores."
              />
            </div>

            <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => void handleSaveMedia()}
                disabled={savingMedia}
                className="theme-bg theme-shadow flex-1 rounded-full px-4 py-3 text-sm font-bold disabled:opacity-60"
              >
                {savingMedia ? 'Salvando...' : 'Salvar midia'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingMedia(false);
                  setCoverDraft(event.imageUrl);
                  setGalleryDraft(event.galleryUrls);
                }}
                disabled={savingMedia}
                className="rounded-full bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <ImageLightbox open={Boolean(lightboxImage)} src={lightboxImage || ''} alt={`Imagem ampliada de ${event.title}`} onClose={() => setLightboxImage(null)} />
    </ContentColumn>
  );
};

export default EventDetail;
