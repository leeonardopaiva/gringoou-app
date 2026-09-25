import React, { startTransition, useDeferredValue, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '../components/feedback/ToastProvider';
import StarRating from '../components/engagement/StarRating';
import CloudinaryImageField from '../components/forms/CloudinaryImageField';
import FieldErrorMessage from '../components/forms/FieldErrorMessage';
import AddressAutocomplete from '../components/forms/AddressAutocomplete';
import { Heart, MapPin, Megaphone, Plus } from 'lucide-react';
import RegionSelector from '../components/RegionSelector';
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
import PageHeader from '../components/navigation/PageHeader';
import { CompactActionCard } from '../components/ui/CompactActionCard';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [businesses, setBusinesses] = useState<Business[]>(initialData?.businesses ?? []);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [resultScope, setResultScope] = useState<'local' | 'global'>(initialData?.scope ?? 'local');
  const initialPageConsumedRef = React.useRef(false);
  const prefetchedAdAccountRef = React.useRef<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<BusinessField>>({});
  const isProfessionalMode = personaMode === 'professional' && Boolean(professionalIdentity);
  const legacyAdAccountId = searchParams?.get('adAccountId') || '';
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
    if (!legacyAdAccountId || prefetchedAdAccountRef.current === legacyAdAccountId) return;
    prefetchedAdAccountRef.current = legacyAdAccountId;
    void fetch('/api/ads/accounts', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload) => {
        const account = Array.isArray(payload?.accounts)
          ? payload.accounts.find((item: { id: string }) => item.id === legacyAdAccountId)
          : null;
        if (!account || account.businessId) return;
        setCreateForm((current) => ({
          ...current,
          name: account.name || current.name,
          phone: account.phone || current.phone,
          address: account.businessAddress || current.address,
          website: account.websiteUrl || current.website,
          imageUrl: account.logoUrl || current.imageUrl,
        }));
      })
      .catch(() => undefined);
  }, [legacyAdAccountId]);

  useEffect(() => {
    if (
      !initialPageConsumedRef.current &&
      initialData?.regionKey === activeRegionKey &&
      activeFilter === 'Todos' &&
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
  }, [activeFilter, activeRegionKey, initialData?.regionKey, refreshKey]);

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
          adAccountId: legacyAdAccountId || undefined,
          website: normalizeUrlFieldValue(createForm.website),
          imageUrl: normalizeUrlFieldValue(createForm.imageUrl),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        showToast(payload?.error ?? 'Nao foi possivel enviar seu negocio.', 'error');
        return;
      }

      showToast(
        legacyAdAccountId
          ? 'Página criada e vinculada. Aguarde a aprovação para promover.'
          : 'Seu negócio foi enviado para aprovação.',
        'success',
      );
      await update();
      setCreateForm(emptyForm);
      setShowCreateForm(false);
      setRefreshKey((current) => current + 1);
      if (legacyAdAccountId) router.push('/ads/overview');
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
        <PageHeader title="Negócios" action={
          <button type="button" onClick={() => setShowCreateForm(true)} className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white transition hover:brightness-105">
            <Plus size={16} /> Criar negócio
          </button>
        } />
        <div className="grid gap-2 sm:grid-cols-1">
          <CompactActionCard icon={<Plus size={16} />} eyebrow="Página gratuita" title="Crie a página do seu negócio" description="Publique após a aprovação da equipe" onClick={() => setShowCreateForm(true)} />
          {/* <CompactActionCard icon={<Megaphone size={16} />} eyebrow="Gringoou Ads" title="Alcance mais pessoas" description="Promova um negócio aprovado" href="/ads" /> */}
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
              <AddressAutocomplete value={createForm.address} onChange={(address) => { setCreateForm((current) => ({ ...current, address })); clearFieldError('address'); }} placeholder="Pesquise rua, número, cidade e estado" />
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
                href={business.canEdit ? `/negocios/${business.slug || business.id}/gerenciar` : `/negocios/${business.slug || business.id}`}
                className="shrink-0 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white transition hover:brightness-105"
              >
                {business.canEdit ? 'Gerenciar' : 'Ver negócio'}
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

