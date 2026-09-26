import React, { startTransition, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import StarRating from '../components/engagement/StarRating';
import { useToast } from '../components/feedback/ToastProvider';
import CloudinaryImageField from '../components/forms/CloudinaryImageField';
import FieldErrorMessage from '../components/forms/FieldErrorMessage';
import ImageGalleryField from '../components/forms/ImageGalleryField';
import { Check, Heart, MapPin, Plus, Search } from 'lucide-react';
import RegionSelector from '../components/RegionSelector';
import PageHeader from '../components/navigation/PageHeader';
import { CompactActionCard } from '../components/ui/CompactActionCard';
import { FilterPopover } from '../components/ui/FilterPopover';
import { SectionHeader } from '../components/ui/SectionHeader';
import { SectionTabs } from '../components/ui/SectionTabs';
import {
  type FieldErrors,
  hasFieldErrors,
  normalizeUrlFieldValue,
  requiredFieldError,
  validateOptionalUrlField,
} from '../lib/forms/validation';
import { parseDateTimeInputPtBr } from '../lib/forms/datetime';
import { EventItem, PersonaMode, ProfessionalProfileIdentity } from '../types';
import type { EventsInitialData } from '../lib/content-contracts';
import { ContentColumn } from '../components/ui/ContentColumn';

const SAMPLE_EVENTS: EventItem[] = [
  {
    id: 'sample-event-1',
    title: 'Torneio de Futebol Brasileiro',
    startsAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    venueName: 'Everett Soccer Field',
    locationLabel: 'Boston, 02108',
    imageUrl: 'https://picsum.photos/seed/soccer/300',
  },
  {
    id: 'sample-event-2',
    title: 'Feira Gastronômica Brasileira',
    startsAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    venueName: 'Charles River Park',
    locationLabel: 'Boston, 02108',
    imageUrl: 'https://picsum.photos/seed/foodfest/300',
  },
];

const EVENT_TABS = ['Hoje', 'Esta semana', 'Proximos', 'Cultural', 'Networking', 'Outros'];
const EVENT_TAB_OPTIONS = EVENT_TABS.map((tab) => ({ id: tab, label: tab }));

const isSameLocalDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const startOfLocalDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfLocalWeek = (value: Date) => {
  const date = startOfLocalDay(value);
  const dayOfWeek = date.getDay();
  const daysUntilSunday = (7 - dayOfWeek) % 7;
  date.setDate(date.getDate() + daysUntilSunday);
  date.setHours(23, 59, 59, 999);
  return date;
};

const emptyForm: {
  title: string;
  description: string;
  venueName: string;
  startsAt: string;
  endsAt: string;
  regionKey: string;
  category: string;
  externalUrl: string;
  imageUrl: string;
  galleryUrls: string[];
} = {
  title: '',
  description: '',
  venueName: '',
  startsAt: '',
  endsAt: '',
  regionKey: '',
  category: 'Outros',
  externalUrl: '',
  imageUrl: '',
  galleryUrls: [],
};
type EventField =
  | 'title'
  | 'description'
  | 'venueName'
  | 'startsAt'
  | 'regionKey'
  | 'externalUrl'
  | 'imageUrl';

type MarketplaceProps = {
  personaMode?: PersonaMode;
  professionalIdentity?: ProfessionalProfileIdentity | null;
  initialData?: EventsInitialData;
};

const Marketplace: React.FC<MarketplaceProps> = ({
  personaMode = 'personal',
  professionalIdentity = null,
  initialData,
}) => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('Proximos');
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<EventItem[]>(initialData?.events ?? []);
  const [resultScope, setResultScope] = useState<'local' | 'global'>(initialData?.scope ?? 'local');
  const initialPageConsumedRef = React.useRef(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [togglingInterestId, setTogglingInterestId] = useState<string | null>(null);
  const [expandedInterestId, setExpandedInterestId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<EventField>>({});
  const isProfessionalMode = personaMode === 'professional' && Boolean(professionalIdentity);
  const activeRegionKey = isProfessionalMode
    ? professionalIdentity?.regionKey || session?.user?.regionKey || ''
    : session?.user?.regionKey || '';

  const clearFieldError = (field: EventField) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      return {
        ...current,
        [field]: undefined,
      };
    });
  };

  useEffect(() => {
    if (searchParams?.get('create') === '1') {
      setShowCreateForm(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (session?.user?.regionKey) {
      setCreateForm((current) =>
        current.regionKey ? current : { ...current, regionKey: session.user.regionKey || '' },
      );
    }
  }, [session?.user?.regionKey]);

  useEffect(() => {
    if (!initialPageConsumedRef.current && initialData?.regionKey === activeRegionKey && refreshKey === 0) {
      initialPageConsumedRef.current = true;
      return;
    }

    let ignore = false;

    const fetchEvents = async () => {
      try {
        const query = activeRegionKey
          ? `?region=${encodeURIComponent(activeRegionKey)}`
          : '';
        const response = await fetch(`/api/events${query}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Nao foi possivel carregar eventos.');
        }

        if (!ignore) {
          startTransition(() => {
            setEvents(payload.events ?? []);
            setResultScope(payload.scope === 'global' ? 'global' : 'local');
          });
        }
      } catch (error) {
        console.error('Failed to load events:', error);
        if (!ignore) {
          setEvents([]);
          setResultScope('local');
        }
      }
    };

    void fetchEvents();

    return () => {
      ignore = true;
    };
  }, [activeRegionKey, initialData?.regionKey, refreshKey]);

  const handleCreateEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: FieldErrors<EventField> = {};
    const parsedStartsAt = createForm.startsAt.trim()
      ? parseDateTimeInputPtBr(createForm.startsAt)
      : null;
    const parsedEndsAt = createForm.endsAt.trim()
      ? parseDateTimeInputPtBr(createForm.endsAt)
      : null;

    if (!createForm.title.trim()) {
      nextErrors.title = requiredFieldError('o titulo do evento');
    }

    if (!createForm.description.trim()) {
      nextErrors.description = requiredFieldError('a descricao do evento');
    }

    if (!createForm.venueName.trim()) {
      nextErrors.venueName = requiredFieldError('o local do evento');
    }

    if (!createForm.startsAt.trim()) {
      nextErrors.startsAt = requiredFieldError('a data de inicio');
    } else if (!parsedStartsAt) {
      nextErrors.startsAt = 'Selecione uma data e horario validos.';
    } else if (createForm.endsAt.trim() && !parsedEndsAt) {
      nextErrors.startsAt = 'Selecione uma data e horario validos.';
    } else if (parsedEndsAt && new Date(parsedEndsAt) < new Date(parsedStartsAt)) {
      nextErrors.startsAt = 'O encerramento nao pode ser antes do inicio.';
    }

    if (!createForm.regionKey.trim()) {
      nextErrors.regionKey = requiredFieldError('uma regiao');
    }

    const externalUrlError = validateOptionalUrlField(createForm.externalUrl, 'O link externo');
    if (externalUrlError) {
      nextErrors.externalUrl = externalUrlError;
    }

    const imageUrlError = validateOptionalUrlField(createForm.imageUrl, 'O link da imagem');
    if (imageUrlError) {
      nextErrors.imageUrl = imageUrlError;
    }

    setFieldErrors(nextErrors);

    if (hasFieldErrors(nextErrors)) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...createForm,
          startsAt: parsedStartsAt || '',
          endsAt: parsedEndsAt || undefined,
          externalUrl: normalizeUrlFieldValue(createForm.externalUrl),
          imageUrl: normalizeUrlFieldValue(createForm.imageUrl),
          galleryUrls: createForm.galleryUrls,
          businessId: isProfessionalMode ? professionalIdentity?.id : undefined,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showToast(payload?.error ?? 'Nao foi possivel enviar o evento.', 'error');
        return;
      }

      showToast('Seu evento foi enviado para aprovacao.', 'success');
      setCreateForm(emptyForm);
      setShowCreateForm(false);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      console.error('Failed to create event:', error);
      showToast('Nao foi possivel enviar o evento.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFavoriteToggle = async (eventItem: EventItem) => {
    setTogglingInterestId(eventItem.id);
    try {
      const response = await fetch(`/api/events/${eventItem.slug || eventItem.id}/favorite`, {
        method: eventItem.isFavorite ? 'DELETE' : 'POST',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showToast(payload?.error ?? 'Nao foi possivel atualizar seus favoritos.', 'error');
        return;
      }

      setEvents((current) =>
        current.map((item) =>
          item.id === eventItem.id
            ? {
                ...item,
                isFavorite: Boolean(payload?.isFavorite),
                interestCount: Math.max(
                  (item.interestCount ?? 0) + (payload?.isFavorite ? 1 : -1),
                  0,
                ),
              }
            : item,
        ),
      );
    } catch (error) {
      console.error('Failed to toggle event favorite from list:', error);
      showToast('Nao foi possivel atualizar seus favoritos.', 'error');
    } finally {
      setTogglingInterestId(null);
    }
  };

  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const weekEnd = endOfLocalWeek(now);
  const displayedEvents = events.filter((item) => {
    const eventDate = new Date(item.startsAt);

    if (Number.isNaN(eventDate.getTime())) {
      return false;
    }

    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
    if (normalizedSearch && ![item.title, item.description, item.venueName, item.locationLabel].filter(Boolean).some((value) => value!.toLocaleLowerCase('pt-BR').includes(normalizedSearch))) {
      return false;
    }

    if (activeTab === 'Hoje') {
      return isSameLocalDay(eventDate, now);
    }

    if (activeTab === 'Esta semana') {
      return eventDate >= todayStart && eventDate <= weekEnd;
    }

    if (activeTab !== 'Proximos') {
      return item.category === activeTab;
    }

    return eventDate >= now || isSameLocalDay(eventDate, now);
  });

  const sectionTitle =
    activeTab === 'Hoje'
      ? 'Eventos de hoje'
      : activeTab === 'Esta semana'
        ? 'Eventos desta semana'
        : 'Eventos proximos';
  return (
    <ContentColumn className="space-y-6 px-5 pb-20 animate-in fade-in duration-500">
      <div className="mt-4 space-y-4">
        <PageHeader title="Eventos" action={
          <button type="button" onClick={() => setShowCreateForm(true)} className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white transition hover:brightness-105">
            <Plus size={16} /> Criar evento
          </button>
        } />
        <div className="grid gap-2 sm:grid-cols-1">
          <CompactActionCard
            icon={<Plus size={16} />}
            eyebrow="Evento gratuito"
            title="Cadastre seu evento"
            description={showCreateForm ? 'Toque para fechar o cadastro' : 'Divulgue para a comunidade local'}
            onClick={() => setShowCreateForm((current) => !current)}
          />
        </div>

        {showCreateForm ? (
          <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-3 sm:items-center sm:p-6">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold theme-text">Cadastrar evento</h3>
                <button type="button" onClick={() => setShowCreateForm(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Fechar</button>
              </div>
              <form
                onSubmit={handleCreateEvent}
                className="space-y-3"
              >
            <input
              required
              value={createForm.title}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, title: event.target.value }))
              }
              onInput={() => clearFieldError('title')}
              aria-invalid={Boolean(fieldErrors.title)}
              placeholder="Titulo do evento"
              className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
            />
            <FieldErrorMessage message={fieldErrors.title} />
            <textarea
              required
              rows={3}
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, description: event.target.value }))
              }
              onInput={() => clearFieldError('description')}
              aria-invalid={Boolean(fieldErrors.description)}
              placeholder="Descricao do evento"
              className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
            />
            <FieldErrorMessage message={fieldErrors.description} />
            <input
              required
              value={createForm.venueName}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, venueName: event.target.value }))
              }
              onInput={() => clearFieldError('venueName')}
              aria-invalid={Boolean(fieldErrors.venueName)}
              placeholder="Local"
              className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
            />
            <FieldErrorMessage message={fieldErrors.venueName} />
            <select value={createForm.category} onChange={(event) => setCreateForm((current) => ({ ...current, category: event.target.value }))} className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none">
              {['Cultural', 'Networking', 'Esporte', 'Gastronomia', 'Família', 'Outros'].map((category) => <option key={category}>{category}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                type="datetime-local"
                value={createForm.startsAt}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, startsAt: event.target.value }))
                }
                onInput={() => clearFieldError('startsAt')}
                aria-invalid={Boolean(fieldErrors.startsAt)}
                placeholder="Data e hora de inicio"
                className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
              />
              <input
                type="datetime-local"
                value={createForm.endsAt}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, endsAt: event.target.value }))
                }
                placeholder="Data e hora de fim"
                className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
              />
            </div>
            <FieldErrorMessage message={fieldErrors.startsAt} />
            <p className="px-2 text-[11px] font-medium text-slate-400">
              Use o seletor para escolher data e horario do evento.
            </p>
            <RegionSelector
              value={createForm.regionKey}
              onChange={(region) => {
                clearFieldError('regionKey');
                setCreateForm((current) => ({ ...current, regionKey: region.key }));
              }}
              hint="Escolha uma regiao existente para padronizar a agenda."
            />
            <FieldErrorMessage message={fieldErrors.regionKey} />
            <input
              value={createForm.externalUrl}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, externalUrl: event.target.value }))
              }
              onInput={() => clearFieldError('externalUrl')}
              aria-invalid={Boolean(fieldErrors.externalUrl)}
              placeholder="Link externo do evento"
              className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
            />
            <FieldErrorMessage message={fieldErrors.externalUrl} />
            <CloudinaryImageField
              value={createForm.imageUrl}
              onChange={(value) =>
                setCreateForm((current) => ({ ...current, imageUrl: value }))
              }
              onClearError={() => clearFieldError('imageUrl')}
              error={fieldErrors.imageUrl}
              folder="events"
              placeholder="Link da imagem do evento"
              hint=""
            />
            <ImageGalleryField
              value={createForm.galleryUrls}
              onChange={(value) =>
                setCreateForm((current) => ({ ...current, galleryUrls: value }))
              }
              folder="events"
              hint="Adicione mais imagens para a pagina detalhada do evento."
            />
                <button
                  type="submit"
                  disabled={submitting || !createForm.regionKey}
                  className="theme-bg theme-bg-hover w-full rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-md disabled:opacity-60"
                >
                  {submitting ? 'Enviando...' : 'Enviar para aprovacao'}
                </button>
              </form>
            </div>
          </div>
        ) : null}

      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <SectionHeader title={sectionTitle}>
            <SectionTabs.Mobile options={EVENT_TAB_OPTIONS} value={activeTab} onChange={setActiveTab} ariaLabel="Selecionar categoria de eventos" />
            <FilterPopover>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar eventos" className="w-full rounded-full border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-brand-200" />
              </div>
            </FilterPopover>
          </SectionHeader>
          <SectionTabs.Desktop options={EVENT_TAB_OPTIONS} value={activeTab} onChange={setActiveTab} ariaLabel="Selecionar categoria de eventos" />
        </div>
        {resultScope === 'global' && events.length > 0 ? (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
            Ainda nao ha eventos publicados na sua regiao. Mostrando eventos de outras regioes.
          </div>
        ) : null}
        {displayedEvents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm font-medium text-slate-500">
            Nenhum evento encontrado para este filtro.
          </div>
        ) : null}
        {displayedEvents.map((item) => (
          <EventCard
            key={item.id}
            interestExpanded={expandedInterestId === item.id}
            onToggleInterestPreview={() =>
              setExpandedInterestId((current) => (current === item.id ? null : item.id))
            }
            interestLoading={togglingInterestId === item.id}
            item={item}
            href={`/eventos/${item.slug || item.id}`}
            title={item.title}
            date={formatEventDate(item.startsAt)}
            location={item.venueName}
            region={item.locationLabel}
            img={item.imageUrl || `https://picsum.photos/seed/${item.id}/300`}
            onToggleFavorite={() => void handleFavoriteToggle(item)}
          />
        ))}
      </div>
    </ContentColumn>
  );
};

const formatEventDate = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const EventCard: React.FC<{
  item: EventItem;
  interestExpanded: boolean;
  onToggleInterestPreview: () => void;
  interestLoading: boolean;
  href: string;
  title: string;
  date: string;
  location: string;
  region: string;
  img: string;
  onToggleFavorite: () => void;
}> = ({
  item,
  interestExpanded,
  onToggleInterestPreview,
  interestLoading,
  href,
  title,
  date,
  location,
  region,
  img,
  onToggleFavorite,
}) => (
    <div
      className={`relative flex min-h-32 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:border-slate-200 ${
        item.status === 'PENDING_REVIEW' || item.isPendingReview ? 'bg-slate-50 opacity-65 grayscale' : ''
      }`}
    >
        <Link href={href} className="absolute inset-0 z-20" aria-label={`Abrir ${title}`} />
        <img src={img} className="w-28 shrink-0 self-stretch object-cover" alt={title} />
        <div className="relative z-10 flex flex-1 flex-col justify-between p-4">
            <div>
                <div className="flex items-start justify-between gap-3">
                    <h4 className="font-bold theme-text text-sm leading-tight">{title}</h4>
                    {item.status === 'PENDING_REVIEW' || item.isPendingReview ? null : (
                      <button
                          type="button"
                          onClick={onToggleFavorite}
                          className={`relative z-30 rounded-full p-2 ${item.isFavorite ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}
                          aria-label={item.isFavorite ? 'Remover dos favoritos' : 'Favoritar evento'}
                      >
                          <Heart size={14} fill={item.isFavorite ? 'currentColor' : 'none'} />
                      </button>
                    )}
                </div>
                {item.status === 'PENDING_REVIEW' || item.isPendingReview ? (
                  <span className="mt-2 inline-flex w-fit rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    Aguardando aprovacao
                  </span>
                ) : null}
                <p className="text-slate-500 text-[10px] mt-1 font-medium">{date}</p>
                <div className="flex items-center gap-1 theme-text text-[10px] font-bold mt-2">
                    <MapPin size={10} fill="currentColor" /> {location}
                </div>
                {region.trim().toLocaleLowerCase('pt-BR') !== location.trim().toLocaleLowerCase('pt-BR') ? (
                  <p className="mt-1 text-[10px] text-slate-400">{region}</p>
                ) : null}
                <div className="mt-2">
                    <StarRating average={item.ratingAverage ?? 0} count={item.ratingCount ?? 0} compact />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onToggleInterestPreview}
                    className="relative z-30 flex items-center rounded-full border border-slate-200 bg-white px-2 py-1"
                    aria-label="Ver interessados"
                  >
                    {(item.interestPreview ?? []).slice(0, 4).map((person, index) => (
                      <img
                        key={person.id}
                        src={person.image || `https://picsum.photos/seed/${person.id}/40`}
                        alt={item.canViewInterestedUsers ? person.name || 'Participante' : 'Participante'}
                        className={`h-6 w-6 rounded-full border-2 border-white object-cover ${item.canViewInterestedUsers ? '' : 'blur-[2px]'}`}
                        style={{ marginLeft: index === 0 ? 0 : -8 }}
                      />
                    ))}
                    <span className="ml-2 text-[11px] font-bold text-slate-600">
                      {item.interestCount ?? 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onToggleFavorite}
                    disabled={interestLoading}
                    title={item.isFavorite ? 'Interessados' : 'Confirmar interesse'}
                    className={`relative z-30 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold disabled:opacity-60 ${
                      item.isFavorite
                        ? 'h-8 w-8 justify-center bg-emerald-600 p-0 text-white shadow-md shadow-emerald-600/25'
                        : 'border border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {interestLoading ? '...' : item.isFavorite ? <Check size={16} className="text-white" /> : 'Confirmar interesse'}
                  </button>
                </div>
                {interestExpanded ? (
                  <p className="mt-1 text-[10px] text-slate-500">
                    {item.canViewInterestedUsers
                      ? (item.interestPreview ?? []).map((person) => person.name || 'Usuario').join(', ') || 'Sem nomes disponiveis.'
                      : item.canUnlockInterestedUsers
                        ? 'Lista de pessoas: recurso premium em breve. Hoje exibimos apenas a quantidade.'
                        : `${item.interestCount ?? 0} pessoas confirmaram interesse.`}
                  </p>
                ) : null}
            </div>
            <span className="theme-bg mt-3 self-end px-4 py-1.5 rounded-xl text-[10px] font-bold text-white shadow-sm">
                {item.canEdit ? 'Editar evento' : 'Ver evento'}
            </span>
        </div>
    </div>
);

export default Marketplace;







