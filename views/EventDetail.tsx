import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  Clock3,
  Copy,
  ExternalLink,
  Globe2,
  Heart,
  Images,
  MapPin,
  MoreHorizontal,
  PencilLine,
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
import { LinkifiedText } from '../components/ui/LinkifiedText';
import { ImageLightbox } from '../components/community/ImageLightbox';
import { notifyContentUpdated } from '../lib/content-refresh';
import { Dropdown } from '../components/ui/Dropdown';

interface EventDetailProps {
  eventId?: string;
  user: User;
}

type EventDetailState = {
  id: string;
  slug: string;
  title: string;
  description: string;
  venueName: string;
  startsAt: string;
  endsAt: string | null;
  locationLabel: string;
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
  canEdit: boolean;
  publicPath: string;
  status: string;
};

const defaultEvent: EventDetailState = {
  id: '',
  slug: '',
  title: 'Evento da comunidade',
  description: 'Os detalhes deste evento ainda nao foram carregados.',
  venueName: 'Local a definir',
  startsAt: new Date().toISOString(),
  endsAt: null,
  locationLabel: '',
  city: '',
  state: '',
  externalUrl: '',
  imageUrl: 'https://picsum.photos/seed/emigrei-event/900/600',
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

const EventDetail: React.FC<EventDetailProps> = ({ eventId, user }) => {
  const { showToast } = useToast();
  const [event, setEvent] = useState<EventDetailState>(defaultEvent);
  const [loading, setLoading] = useState(true);
  const [editingMedia, setEditingMedia] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);
  const [coverDraft, setCoverDraft] = useState('');
  const [galleryDraft, setGalleryDraft] = useState<string[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
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
            description: payload.event.description || defaultEvent.description,
            venueName: payload.event.venueName,
            startsAt: payload.event.startsAt,
            endsAt: payload.event.endsAt || null,
            locationLabel: payload.event.locationLabel || '',
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
            createdByName: payload.event.createdBy?.name || 'Comunidade Gringoou',
            canEdit: Boolean(payload.event.canEdit),
            publicPath: payload.event.publicPath || `/eventos/${payload.event.slug || payload.event.id}`,
            status: payload.event.status || 'PUBLISHED',
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
  }, [eventId, showToast]);

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
    <ContentColumn className="animate-in bg-white pb-24 fade-in duration-500">
      <div className={`relative h-72 ${isPendingReview ? 'grayscale' : ''}`}>
        <img src={event.imageUrl} className="h-full w-full object-cover" alt={event.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {event.canEdit ? <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur"><CalendarDays size={14} className="text-brand-500" /> Você é proprietário</div> : null}

        <div className="absolute right-4 top-4 flex gap-2">
          {event.canEdit ? <Dropdown align="right" trigger={<span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"><MoreHorizontal size={20} /></span>} sections={[{ heading: 'Ações do evento', items: [
            { label: 'Ver página pública', icon: <ExternalLink size={16} />, onClick: () => window.location.assign(event.publicPath) },
            { label: 'Editar imagens', icon: <Images size={16} />, onClick: () => { setCoverDraft(event.imageUrl); setGalleryDraft(event.galleryUrls); setEditingMedia(true); } },
          ] }]} /> : null}
          <button
            type="button"
            onClick={() => void handleFavoriteToggle()}
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm backdrop-blur transition ${
              event.isFavorite ? 'bg-red-600 text-white' : 'bg-surface text-foreground hover:bg-brand-100'
            }`}
            aria-label="Favoritar evento"
          >
            <Heart size={19} fill={event.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-foreground transition hover:bg-brand-100"
            aria-label="Compartilhar evento"
          >
            <Share2 size={19} />
          </button>
        </div>

        <div className="absolute bottom-6 left-5 right-5">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white backdrop-blur-sm">
              Evento
            </div>

          </div>

          <h1 className="mt-3 text-3xl font-bold leading-tight text-white">{event.title}</h1>
          <p className="mt-2 text-sm text-white/85">{event.locationLabel}</p>
        </div>
      </div>

      <div className="space-y-8 px-5 pt-8">
        {isPendingReview ? (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
            Este evento esta aguardando aprovacao e fica visivel apenas para voce e administradores.
          </div>
        ) : null}

        <section className="space-y-4 border-b border-slate-100 pb-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="theme-text inline-flex items-center gap-2 text-sm font-bold">
                <Globe2 size={16} />
                URL publica
              </div>
              <p className="break-all text-sm text-slate-600">{publicUrl}</p>
              <p className="text-xs text-slate-400">Publicado por {event.createdByName}</p>
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
              average={event.ratingAverage}
              count={event.ratingCount}
              viewerRating={event.viewerRating}
              interactive={event.canRate && event.viewerRating === null}
              disabled={!event.canRate || event.viewerRating !== null}
              onRate={(stars) => void handleRateEvent(stars)}
            />
            {!event.canRate ? (
              <p className="mt-2 text-xs font-medium text-slate-500">
                Organizadores e administradores nao podem avaliar este evento.
              </p>
            ) : event.viewerRating ? (
              <p className="mt-2 text-xs font-medium text-slate-500">
                Sua avaliacao ja foi registrada com {event.viewerRating} estrela{event.viewerRating > 1 ? 's' : ''}.
              </p>
            ) : (
              <p className="mt-2 text-xs font-medium text-slate-500">
                Cada usuario pode avaliar este evento uma unica vez.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4 border-b border-slate-100 pb-7">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-4">
              <div className="theme-icon-surface flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                <CalendarDays size={19} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Inicio</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{formatEventDateTime(event.startsAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Clock3 size={19} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Encerramento</p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  {event.endsAt ? formatEventDateTime(event.endsAt) : 'Nao informado'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3 border-b border-slate-100 pb-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
              <MapPin size={16} />
              Local
            </div>
          </div>

          <p className="theme-text text-base font-bold">{event.venueName}</p>
          <div className="space-y-1 text-sm text-slate-600">
            <p>{event.locationLabel}</p>
            {showCityRegion ? <p>{cityRegion}</p> : null}
          </div>
          <LinkifiedText text={event.description} className="text-sm leading-relaxed text-slate-600" />
          {event.externalUrl ? (
            <a
              href={event.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
            >
              <Globe2 size={14} />
              Link do evento
            </a>
          ) : null}
        </section>

        <section className="space-y-4 pb-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
              <Images size={16} />
              Galeria
            </div>

          </div>

          {galleryImages.length === 0 ? (
            <div className="rounded-3xl bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-500">
              Nenhuma imagem adicional cadastrada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {galleryImages.map((imageUrl, index) => (
                <button type="button" onClick={() => setLightboxImage(imageUrl)} key={`${imageUrl}-${index}`} className="aspect-square overflow-hidden rounded-2xl bg-slate-50">
                  <img
                    src={imageUrl}
                    className="h-full w-full object-cover"
                    alt={`${event.title} - imagem ${index + 1}`}
                  />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

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
