import React, { startTransition, useDeferredValue, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '../components/feedback/ToastProvider';
import StarRating from '../components/engagement/StarRating';
import CloudinaryImageField from '../components/forms/CloudinaryImageField';
import FieldErrorMessage from '../components/forms/FieldErrorMessage';
import { Heart, MapPin, Megaphone, Plus } from 'lucide-react';
import RegionSelector from '../components/RegionSelector';
import UnifiedSearchInput from '../components/search/UnifiedSearchInput';
import { formatLoosePhoneInput } from '../lib/forms/phone';
import {
  type FieldErrors,
  hasFieldErrors,
  normalizeUrlFieldValue,
  requiredFieldError,
  validateOptionalUrlField,
  validatePhoneField,
} from '../lib/forms/validation';
import { Business, PersonaMode, ProfessionalProfileIdentity } from '../types';
import type { BusinessesInitialData } from '../lib/content-contracts';
import { ContentColumn } from '../components/ui/ContentColumn';
import { FeedCard } from '../components/ui/FeedCard';
import { Badge } from '../components/ui/Badge';
import { CharacterCounter } from '../components/ui/CharacterCounter';

const SAMPLE_BUSINESSES: Business[] = [
  {
    id: 'sample-1',
    name: 'Minas Grill',
    category: 'Restaurante',
    address: '57 Cambridge St.',
    imageUrl: 'https://picsum.photos/seed/grill/200',
    locationLabel: 'Boston, 02108',
  },
  {
    id: 'sample-2',
    name: 'Supermercado Brasileiro',
    category: 'Mercado',
    address: '67 Chestnut Ave.',
    imageUrl: 'https://picsum.photos/seed/market/200',
    locationLabel: 'Boston, 02108',
  },
];

const emptyForm = {
  name: '',
  category: 'Restaurante',
  description: '',
  address: '',
  regionKey: '',
  phone: '',
  whatsapp: '',
  website: '',
  instagram: '',
  imageUrl: '',
};

type BusinessField =
  | 'name'
  | 'phone'
  | 'address'
  | 'regionKey'
  | 'description'
  | 'website'
  | 'imageUrl';

type BusinessListProps = {
  personaMode?: PersonaMode;
  professionalIdentity?: ProfessionalProfileIdentity | null;
  initialData?: BusinessesInitialData;
};

const BusinessList: React.FC<BusinessListProps> = ({
  personaMode = 'personal',
  professionalIdentity = null,
  initialData,
}) => {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [businesses, setBusinesses] = useState<Business[]>(initialData?.businesses ?? []);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [resultScope, setResultScope] = useState<'local' | 'global'>(initialData?.scope ?? 'local');
  const initialPageConsumedRef = React.useRef(false);
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<BusinessField>>({});
  const deferredSearch = useDeferredValue(search);
  const isProfessionalMode = personaMode === 'professional' && Boolean(professionalIdentity);
  const activeRegionKey = isProfessionalMode
    ? professionalIdentity?.regionKey || session?.user?.regionKey || ''
    : session?.user?.regionKey || '';

  const clearFieldError = (field: BusinessField) => {
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
    if (
      !initialPageConsumedRef.current &&
      initialData?.regionKey === activeRegionKey &&
      activeFilter === 'Todos' &&
      !deferredSearch.trim() &&
      refreshKey === 0
    ) {
      initialPageConsumedRef.current = true;
      return;
    }

    let ignore = false;

    const fetchBusinesses = async () => {
      try {
        const params = new URLSearchParams();
        if (activeFilter && activeFilter !== 'Todos') {
          params.set('category', activeFilter);
        }
        if (deferredSearch.trim()) {
          params.set('search', deferredSearch.trim());
        }
        if (activeRegionKey) {
          params.set('region', activeRegionKey);
        }

        const response = await fetch(`/api/businesses?${params.toString()}`);
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Nao foi possivel carregar negocios.');
        }

        if (!ignore) {
          startTransition(() => {
            setBusinesses(payload.businesses ?? []);
            setResultScope(payload.scope === 'global' ? 'global' : 'local');
          });
        }
      } catch (error) {
        console.error('Failed to load businesses:', error);
        if (!ignore) {
          setBusinesses(SAMPLE_BUSINESSES);
          setResultScope('global');
        }
      }
    };

    fetchBusinesses();

    return () => {
      ignore = true;
    };
  }, [activeFilter, activeRegionKey, deferredSearch, initialData?.regionKey, refreshKey]);

  const handleCreateBusiness = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: FieldErrors<BusinessField> = {};

    if (!createForm.name.trim()) {
      nextErrors.name = requiredFieldError('o nome do negocio');
    }

    if (!createForm.phone.trim()) {
      nextErrors.phone = requiredFieldError('o telefone');
    } else {
      const phoneError = validatePhoneField(createForm.phone, 'O telefone');
      if (phoneError) {
        nextErrors.phone = phoneError;
      }
    }

    if (!createForm.address.trim()) {
      nextErrors.address = requiredFieldError('o endereco');
    }

    if (!createForm.regionKey.trim()) {
      nextErrors.regionKey = requiredFieldError('uma regiao');
    }

    if (!createForm.description.trim()) {
      nextErrors.description = requiredFieldError('a descricao');
    }

    const websiteError = validateOptionalUrlField(createForm.website, 'O website');
    if (websiteError) {
      nextErrors.website = websiteError;
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
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...createForm,
          website: normalizeUrlFieldValue(createForm.website),
          imageUrl: normalizeUrlFieldValue(createForm.imageUrl),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showToast(payload?.error ?? 'Nao foi possivel enviar seu negocio.', 'error');
        return;
      }

      showToast('Seu negocio foi enviado para aprovacao.', 'success');
      await update();
      setCreateForm(emptyForm);
      setShowCreateForm(false);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      console.error('Failed to create business:', error);
      showToast('Nao foi possivel enviar seu negocio.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFavoriteToggle = async (business: Business) => {
    try {
      const response = await fetch(`/api/businesses/${business.slug || business.id}/favorite`, {
        method: business.isFavorite ? 'DELETE' : 'POST',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showToast(payload?.error ?? 'Nao foi possivel atualizar seus favoritos.', 'error');
        return;
      }

      setBusinesses((current) =>
        current.map((item) =>
          item.id === business.id
            ? {
                ...item,
                isFavorite: Boolean(payload?.isFavorite),
              }
            : item,
        ),
      );
    } catch (error) {
      console.error('Failed to toggle business favorite from list:', error);
      showToast('Nao foi possivel atualizar seus favoritos.', 'error');
    }
  };

  return (
    <ContentColumn className="space-y-6 px-5 pb-20 animate-in fade-in duration-500">
      <div className="mt-4 space-y-4">
        <div>
          <div>
            <h1 className="text-2xl font-bold theme-text">Negócios</h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {isProfessionalMode
                ? `Editando como ${professionalIdentity?.name}. Os demais negócios ficam apenas para consulta.`
                : 'Participe da comunidade com seu perfil pessoal e crie gratuitamente a página do seu negócio.'}
            </p>
          </div>
        </div>
        <UnifiedSearchInput
          value={search}
          onChange={setSearch}
          staticPlaceholder="Buscar negócios brasileiros..."
        />

        <button
          type="button"
          onClick={() => setShowCreateForm((current) => !current)}
          className="w-full rounded-card bg-secondary p-4 text-left text-foreground transition hover:brightness-95"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-brand-500">
              <Plus size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">
                Página gratuita do negócio
              </p>
              <p className="mt-1 text-sm font-bold text-foreground">
                Tem uma empresa? Crie sua página sem custo.
              </p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">
                {showCreateForm ? 'Toque para fechar o cadastro.' : 'Após a aprovação, ela aparecerá para a comunidade.'}
              </p>
            </div>
          </div>
        </button>

        <div className="flex items-start gap-4 rounded-card border border-brand-100 bg-brand-50/60 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm">
            <Megaphone size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">Gringoou Ads</p>
            <p className="mt-1 text-sm font-bold text-foreground">Quer alcançar mais pessoas?</p>
            <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">Você paga apenas para promover um negócio aprovado no feed da comunidade.</p>
          </div>
        </div>

      </div>
      {showCreateForm ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-3 sm:items-center sm:p-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold theme-text">Cadastrar negócio</h3>
              <button type="button" onClick={() => setShowCreateForm(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Fechar</button>
            </div>
            <form onSubmit={handleCreateBusiness} className="space-y-3">
              <input required value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} onInput={() => clearFieldError('name')} aria-invalid={Boolean(fieldErrors.name)} placeholder="Nome do negocio" className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none" />
              <FieldErrorMessage message={fieldErrors.name} />
              <div className="grid grid-cols-2 gap-3">
                <select value={createForm.category} onChange={(event) => setCreateForm((current) => ({ ...current, category: event.target.value }))} className="theme-outline-ring h-11 w-full appearance-none rounded-full border-2 border-border bg-surface px-4 text-body-sm text-foreground outline-none">
                  {['Restaurante', 'Mercado', 'Beleza', 'Saude'].map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <input required value={createForm.phone} onChange={(event) => setCreateForm((current) => ({ ...current, phone: formatLoosePhoneInput(event.target.value) }))} onInput={() => clearFieldError('phone')} aria-invalid={Boolean(fieldErrors.phone)} placeholder="Telefone" className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none" />
              </div>
              <FieldErrorMessage message={fieldErrors.phone} />
              <input required value={createForm.address} onChange={(event) => setCreateForm((current) => ({ ...current, address: event.target.value }))} onInput={() => clearFieldError('address')} aria-invalid={Boolean(fieldErrors.address)} placeholder="Endereco" className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none" />
              <FieldErrorMessage message={fieldErrors.address} />
              <RegionSelector value={createForm.regionKey} onChange={(region) => { clearFieldError('regionKey'); setCreateForm((current) => ({ ...current, regionKey: region.key })); }} hint="Escolha uma regiao existente para padronizar a publicacao." />
              <FieldErrorMessage message={fieldErrors.regionKey} />
              <textarea required rows={3} maxLength={600} value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} onInput={() => clearFieldError('description')} aria-invalid={Boolean(fieldErrors.description)} placeholder="Descricao do negocio" className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none" />
              <div className="flex justify-end"><CharacterCounter current={createForm.description.length} max={600} /></div>
              <FieldErrorMessage message={fieldErrors.description} />
              <div className="grid grid-cols-2 gap-3">
                <input value={createForm.website} onChange={(event) => setCreateForm((current) => ({ ...current, website: event.target.value }))} onInput={() => clearFieldError('website')} aria-invalid={Boolean(fieldErrors.website)} placeholder="Website" className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none" />
                <input value={createForm.instagram} onChange={(event) => setCreateForm((current) => ({ ...current, instagram: event.target.value }))} placeholder="Instagram" className="theme-outline-ring w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none" />
              </div>
              <FieldErrorMessage message={fieldErrors.website} />
              <CloudinaryImageField value={createForm.imageUrl} onChange={(value) => setCreateForm((current) => ({ ...current, imageUrl: value }))} onClearError={() => clearFieldError('imageUrl')} error={fieldErrors.imageUrl} folder="businesses" placeholder="Link da imagem de capa" hint="Envie a capa pela Cloudinary ou cole uma URL publica." />
              <button type="submit" disabled={submitting || !createForm.regionKey} className="theme-bg theme-bg-hover w-full rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-md disabled:opacity-60">
                {submitting ? 'Enviando...' : 'Enviar para aprovacao'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['Todos', 'Restaurante', 'Mercado', 'Beleza', 'Saude'].map((category) => (
          <button
            key={category}
            onClick={() => setActiveFilter(category)}
            className={`px-6 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap shadow-sm border ${
              activeFilter === category
                ? 'theme-bg text-white border-transparent'
                : 'bg-white theme-text border-slate-100'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="space-y-4 pb-20">
        <h2 className="font-bold theme-text">Negócios disponíveis</h2>
        {resultScope === 'global' && businesses.length > 0 ? (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
            Ainda nao ha negocios publicados na sua regiao. Mostrando resultados de outras regioes.
          </div>
        ) : null}
        {businesses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm font-medium text-slate-500">
            Nenhum negocio publicado nesta regiao ainda.
          </div>
        ) : null}
        {businesses.map((business) => {
          const isPendingReview = business.status === 'PENDING_REVIEW' || business.isPendingReview;

          return (
          <FeedCard.Root
            key={business.id}
            variant="business"
            className={isPendingReview ? 'bg-slate-50 opacity-65 grayscale' : ''}
          >
            <FeedCard.Header
              avatarUrl={business.imageUrl || `https://picsum.photos/seed/${business.id}/200`}
              avatarAlt={business.name}
              title={business.name}
              subtitle={`${business.category} · ${business.locationLabel || business.address}`}
              href={`/negocios/${business.slug || business.id}`}
              badge={isPendingReview ? <Badge tone="destaque">Em analise</Badge> : <Badge tone="primary">Negocio</Badge>}
              action={!isPendingReview ? (
                <button
                  type="button"
                  onClick={() => void handleFavoriteToggle(business)}
                  className={`rounded-full p-2 transition ${business.isFavorite ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  aria-label={business.isFavorite ? 'Remover dos favoritos' : 'Favoritar negocio'}
                >
                  <Heart size={16} fill={business.isFavorite ? 'currentColor' : 'none'} />
                </button>
              ) : undefined}
            />
            {business.description ? <FeedCard.Content text={business.description} /> : null}
            <Link href={`/negocios/${business.slug || business.id}`} aria-label={`Abrir ${business.name}`}>
              <FeedCard.Media
                src={business.imageUrl || `https://picsum.photos/seed/${business.id}/800/600`}
                alt={business.name}
              />
            </Link>
            <FeedCard.Footer className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <StarRating average={business.ratingAverage ?? 0} count={business.ratingCount ?? 0} compact />
                <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  <MapPin size={12} /> {business.address}
                </p>
              </div>
              <Link
                href={`/negocios/${business.slug || business.id}`}
                className="shrink-0 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white transition hover:brightness-105"
              >
                {business.canEdit ? 'Editar perfil' : 'Ver negocio'}
              </Link>
            </FeedCard.Footer>
          </FeedCard.Root>
          );
        })}
      </div>
    </ContentColumn>
  );
};

export default BusinessList;

