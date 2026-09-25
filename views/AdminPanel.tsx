'use client';

import React, { startTransition, useDeferredValue, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  CircleAlert,
  Download,
  FileSpreadsheet,
  Globe2,
  MapPinned,
  MessageSquareText,
  PencilLine,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Store,
  Upload,
  Users,
} from 'lucide-react';
import BannerManagementSection, { type ManagedBanner } from '../components/admin/BannerManagementSection';
import AdsModerationSection from '../components/admin/AdsModerationSection';
import AdminOverview from '../components/admin/AdminOverview';
import AdminAnalyticsSection from '../components/admin/AdminAnalyticsSection';
import GroupReportsSection from '../components/admin/GroupReportsSection';
import UserDeletionModal from '../components/admin/UserDeletionModal';
import { Button, Modal } from '../components/ui';
import { useToast } from '../components/feedback/ToastProvider';
import CloudinaryImageField from '../components/forms/CloudinaryImageField';
import ImageGalleryField from '../components/forms/ImageGalleryField';
import RegionSelector from '../components/RegionSelector';
import { formatDateTimeLocalInput, parseDateTimeInputPtBr } from '../lib/forms/datetime';
import { normalizeUrlFieldValue } from '../lib/forms/validation';
import { formatLoosePhoneInput } from '../lib/forms/phone';
import { normalizeUsernameInput } from '../lib/username';
import { formatVisibilityScopeLabel } from '../lib/visibility';
import type { User } from '../types';

type BusinessAction = 'approve' | 'reject' | 'suspend';
type EventAction = 'approve' | 'reject' | 'cancel';
type PostAction = 'approve' | 'remove';

type BusinessStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'SUSPENDED';
type EventStatus = 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'CANCELED';
type UserRoleValue = 'USER' | 'BUSINESS_OWNER' | 'MODERATOR' | 'ADMIN';
type VisibilityScopeValue = 'GLOBAL' | 'USER_REGION' | 'SPECIFIC_REGION';

type AdminActor = {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
};

type PendingBusiness = {
  id: string;
  name: string;
  category: string;
  address: string;
  locationLabel: string;
  createdAt: string;
  createdBy: AdminActor;
};

type PendingEvent = {
  id: string;
  title: string;
  venueName: string;
  locationLabel: string;
  startsAt: string;
  createdAt: string;
  createdBy: AdminActor;
};

type PendingPost = {
  id: string;
  content: string;
  locationLabel: string;
  createdAt: string;
  author: AdminActor;
};

type ManagedRegion = {
  key: string;
  label: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  aliases: string[];
  isActive: boolean;
  updatedAt: string;
};

type ManagedBusiness = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  address: string;
  locationLabel: string;
  regionKey: string;
  visibilityScope: VisibilityScopeValue;
  visibilityRegionKey: string | null;
  imageUrl: string | null;
  galleryUrls: string[];
  status: BusinessStatus;
  createdAt: string;
  updatedAt: string;
  visibilityRegion?: {
    key: string;
    label: string;
  } | null;
  createdBy: AdminActor;
};

type ManagedEvent = {
  id: string;
  title: string;
  slug: string;
  description: string;
  venueName: string;
  startsAt: string;
  endsAt: string | null;
  locationLabel: string;
  regionKey: string;
  visibilityScope: VisibilityScopeValue;
  visibilityRegionKey: string | null;
  externalUrl: string | null;
  imageUrl: string | null;
  galleryUrls: string[];
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  visibilityRegion?: {
    key: string;
    label: string;
  } | null;
  createdBy: AdminActor;
};

type ManagedUser = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  role: UserRoleValue;
  locationLabel: string | null;
  regionKey: string | null;
  onboardingCompleted: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
};

type SuggestionCategoryValue = 'FUNCTIONALITY' | 'IMPROVEMENT';
type SuggestionStatusValue = 'NEW' | 'REVIEWED';

type ManagedSuggestion = {
  id: string;
  category: SuggestionCategoryValue;
  message: string;
  status: SuggestionStatusValue;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    image: string | null;
    locationLabel: string | null;
  };
};

type AdminDashboardData = {
  stats: {
    totalUsers: number;
    businessOwners: number;
    publishedBusinesses: number;
    publishedEvents: number;
    publishedPosts: number;
    pendingBusinesses: number;
    pendingEvents: number;
    pendingPosts: number;
    totalRegions: number;
    activeRegions: number;
    newSuggestions: number;
    totalReferrals: number;
    convertedReferrals: number;
  };
  pendingBusinesses: PendingBusiness[];
  pendingEvents: PendingEvent[];
  pendingPosts: PendingPost[];
  banners: ManagedBanner[];
  businesses: ManagedBusiness[];
  events: ManagedEvent[];
  users: ManagedUser[];
  regions: ManagedRegion[];
  suggestions: ManagedSuggestion[];
  referrals: { total: number; converted: number; conversionRate: number; topReferrer: { name: string | null; username: string | null; locationLabel: string | null; interests: string[]; count: number } | null };
};

type AnalyticsSummary = {
  totalEvents: number;
  disabledFeatureClicks: number;
  bannerClicks: number;
  searchQueries: number;
  trackedUsers: number;
};

type AnalyticsTopFeature = {
  targetKey: string;
  label: string;
  sourceSection: string | null;
  count: number;
};

type AnalyticsTopBanner = {
  targetKey: string;
  label: string;
  count: number;
};

type AnalyticsTopSource = {
  sourceSection: string;
  count: number;
};

type AnalyticsTopSearch = {
  term: string;
  regionKey: string | null;
  regionLabel: string;
  count: number;
};

type ManagedAnalyticsEvent = {
  id: string;
  type: 'disabled_feature_click' | 'banner_click' | 'banner_registration' | 'search_query';
  targetType: 'feature' | 'banner' | 'search';
  targetKey: string;
  label: string;
  sourcePath: string | null;
  sourceSection: string | null;
  regionKey: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

type AdminAnalyticsData = {
  windowDays: number;
  filters: {
    type: string | null;
    regionKey: string | null;
  };
  selectedUser: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    image: string | null;
    locationLabel: string | null;
    regionKey: string | null;
  } | null;
  summary: AnalyticsSummary;
  topDisabledFeatures: AnalyticsTopFeature[];
  topBanners: AnalyticsTopBanner[];
  topSources: AnalyticsTopSource[];
  topSearchesByRegion: AnalyticsTopSearch[];
  dailyActivity: Array<{
    date: string;
    totalEvents: number;
    bannerClicks: number;
    searchQueries: number;
  }>;
  activeRegions: Array<{
    regionKey: string;
    count: number;
  }>;
  recentEvents: ManagedAnalyticsEvent[];
};

type AdminImportError = {
  sheet: string;
  row: number;
  field: string;
  message: string;
};

type AdminImportDraft = {
  regions: unknown[];
  businesses: unknown[];
  events: unknown[];
};

type AdminImportPreview = {
  draft: AdminImportDraft;
  errors: AdminImportError[];
  summary: {
    regions: number;
    businesses: number;
    events: number;
  };
};

type RegionFormState = {
  key: string;
  label: string;
  city: string;
  state: string;
  lat: string;
  lng: string;
  aliases: string;
  isActive: boolean;
};

type BusinessFormState = {
  name: string;
  category: string;
  description: string;
  phone: string;
  whatsapp: string;
  website: string;
  instagram: string;
  address: string;
  regionKey: string;
  visibilityScope: VisibilityScopeValue;
  visibilityRegionKey: string;
  imageUrl: string;
  galleryUrls: string[];
  status: BusinessStatus;
};

type EventFormState = {
  title: string;
  description: string;
  venueName: string;
  startsAt: string;
  endsAt: string;
  regionKey: string;
  visibilityScope: VisibilityScopeValue;
  visibilityRegionKey: string;
  externalUrl: string;
  imageUrl: string;
  galleryUrls: string[];
  status: EventStatus;
};

type UserFormState = {
  name: string;
  username: string;
  email: string;
  phone: string;
  image: string;
  role: UserRoleValue;
  regionKey: string;
  onboardingCompleted: boolean;
};

const emptyRegionForm: RegionFormState = {
  key: '',
  label: '',
  city: '',
  state: '',
  lat: '',
  lng: '',
  aliases: '',
  isActive: true,
};

const emptyBusinessForm: BusinessFormState = {
  name: '',
  category: '',
  description: '',
  phone: '',
  whatsapp: '',
  website: '',
  instagram: '',
  address: '',
  regionKey: '',
  visibilityScope: 'USER_REGION',
  visibilityRegionKey: '',
  imageUrl: '',
  galleryUrls: [],
  status: 'PENDING_REVIEW',
};

const emptyEventForm: EventFormState = {
  title: '',
  description: '',
  venueName: '',
  startsAt: '',
  endsAt: '',
  regionKey: '',
  visibilityScope: 'USER_REGION',
  visibilityRegionKey: '',
  externalUrl: '',
  imageUrl: '',
  galleryUrls: [],
  status: 'PENDING_REVIEW',
};

const emptyUserForm: UserFormState = {
  name: '',
  username: '',
  email: '',
  phone: '',
  image: '',
  role: 'USER',
  regionKey: '',
  onboardingCompleted: true,
};

type ConfirmationDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'primary' | 'danger';
  onConfirm: () => Promise<void> | void;
};

const businessStatusOptions: BusinessStatus[] = [
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'SUSPENDED',
];

const eventStatusOptions: EventStatus[] = [
  'PENDING_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'CANCELED',
];

const userRoleOptions: UserRoleValue[] = ['USER', 'BUSINESS_OWNER', 'MODERATOR', 'ADMIN'];
const visibilityScopeOptions: VisibilityScopeValue[] = ['USER_REGION', 'SPECIFIC_REGION', 'GLOBAL'];

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

const summarize = (value: string, limit = 150) =>
  value.length > limit ? `${value.slice(0, limit).trimEnd()}...` : value;

const matchesAdminSearch = (query: string, values: Array<string | null | undefined>) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
};

const sortRegions = (regions: ManagedRegion[]) =>
  [...regions].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

const getBusinessStatusTone = (status: BusinessStatus) => {
  switch (status) {
    case 'PUBLISHED':
      return 'success';
    case 'REJECTED':
    case 'SUSPENDED':
      return 'danger';
    default:
      return 'warning';
  }
};

const getEventStatusTone = (status: EventStatus) => {
  switch (status) {
    case 'PUBLISHED':
      return 'success';
    case 'REJECTED':
    case 'CANCELED':
      return 'danger';
    default:
      return 'warning';
  }
};

const getSuggestionStatusTone = (status: SuggestionStatusValue) =>
  status === 'REVIEWED' ? 'success' : 'warning';

const formatSuggestionCategory = (category: SuggestionCategoryValue) =>
  category === 'FUNCTIONALITY' ? 'Funcionalidade' : 'Melhoria';

const ADMIN_LIST_PREVIEW_LIMIT = 5;
type ExpandableSectionKey = 'regions' | 'businesses' | 'events' | 'users' | 'suggestions';

type AdminSection = 'overview' | 'moderation' | 'ads' | 'imports' | 'banners' | 'regions' | 'businesses' | 'events' | 'users' | 'suggestions' | 'analytics';

const AdminPanel: React.FC<{ user: User; initialSection?: AdminSection }> = ({ user, initialSection }) => {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const headerSearch = searchParams?.get('q')?.trim() ?? '';
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [editingRegionKey, setEditingRegionKey] = useState<string | null>(null);
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [regionForm, setRegionForm] = useState<RegionFormState>(emptyRegionForm);

  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
  const [businessForm, setBusinessForm] = useState<BusinessFormState>(emptyBusinessForm);
  const [businessSearch, setBusinessSearch] = useState('');

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState>(emptyEventForm);
  const [eventSearch, setEventSearch] = useState('');
  const [activeSection, setActiveSection] = useState<
    | 'overview'
    | 'moderation'
    | 'ads'
    | 'imports'
    | 'banners'
    | 'regions'
    | 'businesses'
    | 'events'
    | 'users'
    | 'suggestions'
    | 'analytics'
  >(initialSection ?? 'moderation');

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);
  const [userSearch, setUserSearch] = useState('');
  const [suggestionSearch, setSuggestionSearch] = useState('');
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<AdminImportPreview | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedAnalyticsUserId, setSelectedAnalyticsUserId] = useState<string | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState('30');
  const [analyticsRegionFilter, setAnalyticsRegionFilter] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<ExpandableSectionKey, boolean>>({
    regions: false,
    businesses: false,
    events: false,
    users: false,
    suggestions: false,
  });
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState | null>(null);
  const deferredBusinessSearch = useDeferredValue(businessSearch);
  const deferredEventSearch = useDeferredValue(eventSearch);
  const deferredUserSearch = useDeferredValue(userSearch);
  const deferredSuggestionSearch = useDeferredValue(suggestionSearch);

  const loadDashboard = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await fetch('/api/admin/dashboard', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel carregar o painel admin.');
      }

      startTransition(() => {
        setDashboard(payload);
      });
    } catch (loadError) {
      console.error('Failed to load admin dashboard:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar o painel admin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAnalytics = async (userId: string | null = selectedAnalyticsUserId) => {
    setAnalyticsLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      if (userId) query.set('userId', userId);
      if (analyticsDays) query.set('days', analyticsDays);
      if (analyticsRegionFilter) query.set('regionKey', analyticsRegionFilter);
      const queryString = query.toString();
      const response = await fetch(`/api/admin/analytics${queryString ? `?${queryString}` : ''}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel carregar os analytics.');
      }

      startTransition(() => {
        setAnalytics(payload);
      });
    } catch (loadError) {
      console.error('Failed to load admin analytics:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar os analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  useEffect(() => {
    if (message) {
      showToast(message, 'success');
    }
  }, [message, showToast]);

  useEffect(() => {
    if (activeSection === 'analytics') {
      void loadAnalytics(selectedAnalyticsUserId);
    }
  }, [activeSection, selectedAnalyticsUserId, analyticsDays, analyticsRegionFilter]);

  useEffect(() => {
    if (!headerSearch) return;
    if (activeSection === 'businesses') setBusinessSearch(headerSearch);
    if (activeSection === 'events') setEventSearch(headerSearch);
    if (activeSection === 'users') setUserSearch(headerSearch);
    if (activeSection === 'suggestions') setSuggestionSearch(headerSearch);
  }, [activeSection, headerSearch]);

  const totalPending = dashboard
    ? dashboard.stats.pendingBusinesses + dashboard.stats.pendingEvents + dashboard.stats.pendingPosts
    : 0;

  const runAction = async (
    key: string,
    request: () => Promise<Response>,
    successMessage: string,
    fallbackError: string,
    resetEditState?: () => void,
  ) => {
    setProcessingKey(key);
    setError(null);
    setMessage(null);

    try {
      const response = await request();
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? fallbackError);
      }

      resetEditState?.();
      setMessage(successMessage);
      await loadDashboard(true);
    } catch (actionError) {
      console.error(fallbackError, actionError);
      setError(actionError instanceof Error ? actionError.message : fallbackError);
    } finally {
      setProcessingKey(null);
    }
  };

  const submitBusinessReview = (businessId: string, action: BusinessAction) =>
    runAction(
      `business:${businessId}:${action}`,
      () =>
        fetch(`/api/admin/businesses/${businessId}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }),
      action === 'approve' ? 'Negocio aprovado e publicado.' : 'Negocio atualizado na fila.',
      'Nao foi possivel revisar o negocio.',
    );

  const submitEventReview = (eventId: string, action: EventAction) =>
    runAction(
      `event:${eventId}:${action}`,
      () =>
        fetch(`/api/admin/events/${eventId}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }),
      action === 'approve' ? 'Evento aprovado e publicado.' : 'Evento atualizado na fila.',
      'Nao foi possivel revisar o evento.',
    );

  const submitPostReview = (postId: string, action: PostAction) =>
    runAction(
      `post:${postId}:${action}`,
      () =>
        fetch(`/api/admin/community/posts/${postId}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }),
      action === 'approve' ? 'Publicacao aprovada e liberada.' : 'Publicacao removida.',
      'Nao foi possivel revisar a publicacao.',
    );

  const resetRegionForm = () => {
    setEditingRegionKey(null);
    setRegionForm(emptyRegionForm);
    setRegionModalOpen(false);
  };

  const startRegionEdit = (region: ManagedRegion) => {
    setEditingRegionKey(region.key);
    setRegionForm({
      key: region.key,
      label: region.label,
      city: region.city,
      state: region.state,
      lat: String(region.lat),
      lng: String(region.lng),
      aliases: region.aliases.join(', '),
      isActive: region.isActive,
    });
    setError(null);
    setMessage(null);
    setRegionModalOpen(true);
  };

  const submitRegion = async () => {
    if (!regionForm.label.trim() || !regionForm.city.trim() || !regionForm.state.trim()) {
      setError('Preencha nome, cidade e estado da regiao.');
      return;
    }

    if (!regionForm.lat.trim() || !regionForm.lng.trim()) {
      setError('Informe latitude e longitude validas.');
      return;
    }

    const route = editingRegionKey
      ? `/api/admin/regions/${editingRegionKey}`
      : '/api/admin/regions';

    await runAction(
      editingRegionKey ? `region:${editingRegionKey}:save` : 'region:create',
      () =>
        fetch(route, {
          method: editingRegionKey ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: regionForm.key.trim() || undefined,
            label: regionForm.label.trim(),
            city: regionForm.city.trim(),
            state: regionForm.state.trim(),
            lat: Number(regionForm.lat),
            lng: Number(regionForm.lng),
            aliases: regionForm.aliases
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
            isActive: regionForm.isActive,
          }),
        }),
      editingRegionKey ? 'Regiao atualizada.' : 'Regiao criada.',
      'Nao foi possivel salvar a regiao.',
      resetRegionForm,
    );
  };

  const toggleRegionStatus = async (region: ManagedRegion) => {
    await runAction(
      `region:${region.key}:toggle`,
      () =>
        fetch(`/api/admin/regions/${region.key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: region.label,
            city: region.city,
            state: region.state,
            lat: region.lat,
            lng: region.lng,
            aliases: region.aliases,
            isActive: !region.isActive,
          }),
        }),
      region.isActive ? 'Regiao desativada.' : 'Regiao ativada.',
      'Nao foi possivel atualizar a regiao.',
    );
  };

  const resetBusinessForm = () => {
    setEditingBusinessId(null);
    setBusinessForm(emptyBusinessForm);
  };

  const startBusinessEdit = (business: ManagedBusiness) => {
    setEditingBusinessId(business.id);
    setBusinessForm({
      name: business.name,
      category: business.category,
      description: business.description || '',
      phone: business.phone || '',
      whatsapp: business.whatsapp || '',
      website: business.website || '',
      instagram: business.instagram || '',
      address: business.address,
      regionKey: business.regionKey,
      visibilityScope: business.visibilityScope,
      visibilityRegionKey: business.visibilityRegionKey || '',
      imageUrl: business.imageUrl || '',
      galleryUrls: business.galleryUrls || [],
      status: business.status,
    });
    setError(null);
    setMessage(null);
  };

  const submitBusinessUpdate = async () => {
    if (!editingBusinessId) {
      return;
    }

    await runAction(
      `business:${editingBusinessId}:save`,
      () =>
        fetch(`/api/admin/businesses/${editingBusinessId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...businessForm,
            website: normalizeUrlFieldValue(businessForm.website),
            imageUrl: normalizeUrlFieldValue(businessForm.imageUrl),
            galleryUrls: businessForm.galleryUrls,
            visibilityRegionKey:
              businessForm.visibilityScope === 'SPECIFIC_REGION'
                ? businessForm.visibilityRegionKey || undefined
                : undefined,
          }),
        }),
      'Negocio atualizado.',
      'Nao foi possivel salvar o negocio.',
      resetBusinessForm,
    );
  };

  const resetEventForm = () => {
    setEditingEventId(null);
    setEventForm(emptyEventForm);
  };

  const startEventEdit = (event: ManagedEvent) => {
    setEditingEventId(event.id);
    setEventForm({
      title: event.title,
      description: event.description,
      venueName: event.venueName,
      startsAt: formatDateTimeLocalInput(event.startsAt),
      endsAt: formatDateTimeLocalInput(event.endsAt),
      regionKey: event.regionKey,
      visibilityScope: event.visibilityScope,
      visibilityRegionKey: event.visibilityRegionKey || '',
      externalUrl: event.externalUrl || '',
      imageUrl: event.imageUrl || '',
      galleryUrls: event.galleryUrls || [],
      status: event.status,
    });
    setError(null);
    setMessage(null);
  };

  const submitEventUpdate = async () => {
    if (!editingEventId) {
      return;
    }

    const parsedStartsAt = parseDateTimeInputPtBr(eventForm.startsAt);
    const parsedEndsAt = eventForm.endsAt ? parseDateTimeInputPtBr(eventForm.endsAt) : null;

    if (!parsedStartsAt) {
      setError('Selecione uma data e horario validos para o inicio do evento.');
      return;
    }

    if (eventForm.endsAt && !parsedEndsAt) {
      setError('Selecione uma data e horario validos para o encerramento do evento.');
      return;
    }

    if (parsedEndsAt && new Date(parsedEndsAt) < new Date(parsedStartsAt)) {
      setError('O encerramento nao pode ser antes do inicio do evento.');
      return;
    }

    await runAction(
      `event:${editingEventId}:save`,
      () =>
        fetch(`/api/admin/events/${editingEventId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...eventForm,
            startsAt: parsedStartsAt,
            endsAt: parsedEndsAt || undefined,
            externalUrl: normalizeUrlFieldValue(eventForm.externalUrl),
            imageUrl: normalizeUrlFieldValue(eventForm.imageUrl),
            galleryUrls: eventForm.galleryUrls,
            visibilityRegionKey:
              eventForm.visibilityScope === 'SPECIFIC_REGION'
                ? eventForm.visibilityRegionKey || undefined
                : undefined,
          }),
        }),
      'Evento atualizado.',
      'Nao foi possivel salvar o evento.',
      resetEventForm,
    );
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserForm(emptyUserForm);
  };

  const startUserEdit = (managedUser: ManagedUser) => {
    setEditingUserId(managedUser.id);
    setUserForm({
      name: managedUser.name || '',
      username: managedUser.username || '',
      email: managedUser.email || '',
      phone: managedUser.phone || '',
      image: managedUser.image || '',
      role: managedUser.role,
      regionKey: managedUser.regionKey || '',
      onboardingCompleted: managedUser.onboardingCompleted,
    });
    setError(null);
    setMessage(null);
  };

  const submitUserUpdate = async () => {
    if (!editingUserId) {
      return;
    }

    await runAction(
      `user:${editingUserId}:save`,
      () =>
        fetch(`/api/admin/users/${editingUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...userForm,
            username: normalizeUsernameInput(userForm.username),
            email: userForm.email.trim() || undefined,
            image: normalizeUrlFieldValue(userForm.image),
          }),
        }),
      'Usuario atualizado.',
      'Nao foi possivel salvar o usuario.',
      resetUserForm,
    );
  };

  const requestUserUpdateConfirmation = (managedUser: ManagedUser) => {
    const isPromotingToAdmin =
      managedUser.role !== 'ADMIN' && userForm.role === 'ADMIN';
    const isDemotingAdmin =
      managedUser.role === 'ADMIN' && userForm.role !== 'ADMIN';

    if (isPromotingToAdmin) {
      setConfirmationDialog({
        title: 'Confirmar nova permissao de admin',
        description: `Voce esta concedendo acesso total de administrador para ${managedUser.name || managedUser.email || managedUser.username || 'este usuario'}.`,
        confirmLabel: 'Confirmar promocao',
        tone: 'primary',
        onConfirm: async () => {
          await submitUserUpdate();
        },
      });
      return;
    }

    if (isDemotingAdmin) {
      setConfirmationDialog({
        title: 'Confirmar remocao de admin',
        description: `Voce esta removendo a permissao de administrador de ${managedUser.name || managedUser.email || managedUser.username || 'este usuario'}.`,
        confirmLabel: 'Confirmar rebaixamento',
        tone: 'danger',
        onConfirm: async () => {
          await submitUserUpdate();
        },
      });
      return;
    }

    void submitUserUpdate();
  };

  const updateSuggestionStatus = async (
    suggestion: ManagedSuggestion,
    status: SuggestionStatusValue,
  ) => {
    await runAction(
      `suggestion:${suggestion.id}:${status.toLowerCase()}`,
      () =>
        fetch(`/api/admin/suggestions/${suggestion.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }),
      status === 'REVIEWED'
        ? 'Sugestao marcada como revisada.'
        : 'Sugestao reaberta para analise.',
      'Nao foi possivel atualizar a sugestao.',
    );
  };

  const submitImportPreview = async (file: File | null) => {
    if (!file) {
      return;
    }

    setProcessingKey('import:preview');
    setError(null);
    setMessage(null);
    setImportPreview(null);
    setImportFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/import/preview', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel validar o arquivo.');
      }

      setImportPreview(payload);

      if (payload.errors?.length) {
        setError('Arquivo validado com erros. Corrija as linhas indicadas antes de importar.');
      } else {
        setMessage('Arquivo validado sem erros. Revise a previa e confirme a importacao.');
      }
    } catch (importError) {
      console.error('Failed to preview admin import:', importError);
      setError(importError instanceof Error ? importError.message : 'Nao foi possivel validar o arquivo.');
    } finally {
      setProcessingKey(null);
    }
  };

  const confirmImport = async () => {
    if (!importPreview || importPreview.errors.length > 0) {
      setError('Valide um arquivo sem erros antes de confirmar a importacao.');
      return;
    }

    await runAction(
      'import:commit',
      () =>
        fetch('/api/admin/import/commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft: importPreview.draft }),
        }),
      'Importacao concluida.',
      'Nao foi possivel concluir a importacao.',
      () => {
        setImportPreview(null);
        setImportFileName(null);
      },
    );
  };

  const openUserAnalytics = (managedUserId: string) => {
    setSelectedAnalyticsUserId(managedUserId);
    setActiveSection('analytics');
  };

  const statsCards = dashboard
    ? [
        { label: 'Usuarios', value: dashboard.stats.totalUsers, icon: <Users size={20} />, accent: 'theme-soft-surface theme-text', section: 'users' as const },
        { label: 'Donos de negocios', value: dashboard.stats.businessOwners, icon: <Store size={20} />, accent: 'bg-emerald-50 text-emerald-800', section: 'users' as const },
        { label: 'Negocios publicados', value: dashboard.stats.publishedBusinesses, icon: <Building2 size={20} />, accent: 'bg-orange-50 text-orange-800', section: 'businesses' as const },
        { label: 'Eventos publicados', value: dashboard.stats.publishedEvents, icon: <CalendarDays size={20} />, accent: 'theme-soft-surface theme-text', section: 'events' as const },
        { label: 'Posts publicados', value: dashboard.stats.publishedPosts, icon: <MessageSquareText size={20} />, accent: 'bg-violet-50 text-violet-800', section: 'moderation' as const },
        { label: 'Regioes ativas', value: dashboard.stats.activeRegions, icon: <Globe2 size={20} />, accent: 'bg-sky-50 text-sky-800', section: 'regions' as const },
      ]
    : [];

  const filteredBusinesses =
    dashboard?.businesses.filter((business) =>
      matchesAdminSearch(deferredBusinessSearch, [
        business.name,
        business.slug,
        business.category,
        business.locationLabel,
        business.address,
        business.createdBy.name,
        business.createdBy.email,
      ]),
    ) ?? [];

  const filteredEvents =
    dashboard?.events.filter((event) =>
      matchesAdminSearch(deferredEventSearch, [
        event.title,
        event.slug,
        event.venueName,
        event.locationLabel,
        event.createdBy.name,
        event.createdBy.email,
      ]),
    ) ?? [];

  const filteredUsers =
    dashboard?.users.filter((managedUser) =>
      matchesAdminSearch(deferredUserSearch, [
        managedUser.name,
        managedUser.username,
        managedUser.email,
        managedUser.phone,
        managedUser.locationLabel,
        managedUser.role,
      ]),
    ) ?? [];

  const filteredSuggestions =
    dashboard?.suggestions.filter((suggestion) =>
      matchesAdminSearch(deferredSuggestionSearch, [
        suggestion.category,
        suggestion.status,
        suggestion.message,
        suggestion.user.name,
        suggestion.user.username,
        suggestion.user.email,
        suggestion.user.locationLabel,
      ]),
    ) ?? [];

  const sortedRegions = sortRegions(dashboard?.regions ?? []);

  const getVisibleItems = <T,>(
    items: T[],
    section: ExpandableSectionKey,
    query = '',
  ) => (query.trim() || expandedSections[section] ? items : items.slice(0, ADMIN_LIST_PREVIEW_LIMIT));

  const visibleRegions = getVisibleItems(sortedRegions, 'regions');
  const visibleBusinesses = getVisibleItems(filteredBusinesses, 'businesses', deferredBusinessSearch);
  const visibleEvents = getVisibleItems(filteredEvents, 'events', deferredEventSearch);
  const visibleUsers = getVisibleItems(filteredUsers, 'users', deferredUserSearch);
  const visibleSuggestions = getVisibleItems(
    filteredSuggestions,
    'suggestions',
    deferredSuggestionSearch,
  );

  const sectionTabs = [
    { id: 'moderation' as const, label: 'Moderação', count: totalPending },
    { id: 'ads' as const, label: 'Anúncios pagos', count: 0 },
    { id: 'imports' as const, label: 'Importação', count: importPreview ? importPreview.summary.regions + importPreview.summary.businesses + importPreview.summary.events : 0 },
    { id: 'banners' as const, label: 'Banners', count: dashboard?.banners.length ?? 0 },
    { id: 'regions' as const, label: 'Regiões', count: dashboard?.stats.totalRegions ?? 0 },
    { id: 'businesses' as const, label: 'Negócios', count: filteredBusinesses.length },
    { id: 'events' as const, label: 'Eventos', count: filteredEvents.length },
    { id: 'users' as const, label: 'Usuários', count: filteredUsers.length },
    { id: 'suggestions' as const, label: 'Sugestões', count: dashboard?.stats.newSuggestions ?? 0 },
    { id: 'analytics' as const, label: 'Analytics', count: analytics?.summary.totalEvents ?? 0 },
  ];
  const selectedTab = sectionTabs.find((tab) => tab.id === activeSection) ?? sectionTabs[0];
  const analyticsHighlightData = [
    { label: 'Usuários', value: dashboard?.stats.totalUsers ?? 0 },
    { label: 'Negócios', value: dashboard?.stats.publishedBusinesses ?? 0 },
    { label: 'Eventos', value: dashboard?.stats.publishedEvents ?? 0 },
    { label: 'Posts', value: dashboard?.stats.publishedPosts ?? 0 },
  ];
  const analyticsMaxValue = Math.max(...analyticsHighlightData.map((item) => item.value), 1);
  const sectionMeta: Record<Exclude<AdminSection, 'overview' | 'ads'>, { title: string; description: string }> = {
    moderation: { title: 'Moderacao da Comunidade', description: 'Revise conteudos, negocios e eventos sinalizados pela comunidade.' },
    imports: { title: 'Importacoes', description: 'Valide e importe dados operacionais com seguranca.' },
    banners: { title: 'Banners', description: 'Gerencie os banners editoriais e seus periodos de exibicao.' },
    regions: { title: 'Regioes', description: 'Organize as localidades disponiveis em toda a plataforma.' },
    businesses: { title: 'Negocios', description: 'Consulte, revise e atualize os negocios cadastrados.' },
    events: { title: 'Eventos', description: 'Gerencie eventos publicados e pendentes de revisao.' },
    users: { title: 'Usuarios', description: 'Administre perfis, acessos e permissoes da plataforma.' },
    suggestions: { title: 'Sugestoes', description: 'Acompanhe os feedbacks enviados pelos usuarios.' },
    analytics: { title: 'Analytics', description: 'Analise uso, buscas, campanhas e interacoes na plataforma.' },
  };

  if (activeSection === 'overview') {
    return <AdminOverview dashboard={dashboard} loading={loading} refreshing={refreshing} onRefresh={() => void loadDashboard(true)} onNavigate={(section) => window.location.assign(`/admin/${section === 'moderation' ? 'moderation' : section}`)} />;
  }

  if (activeSection === 'ads') {
    return <AdsModerationSection />;
  }

  return (
    <div className="mx-auto max-w-[1500px] animate-in space-y-6 px-4 py-7 fade-in duration-500 sm:px-7 lg:px-8">
      {activeSection !== 'analytics' ? <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-400">Admin · {sectionMeta[activeSection as Exclude<AdminSection, 'overview' | 'ads'>].title}</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#132F40] sm:text-[28px]">{sectionMeta[activeSection as Exclude<AdminSection, 'overview' | 'ads'>].title}</h1>
          <p className="mt-1 text-sm text-slate-400">{sectionMeta[activeSection as Exclude<AdminSection, 'overview' | 'ads'>].description}</p>
        </div>
        <Button iconLeft={<RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />} disabled={refreshing || loading} onClick={() => void loadDashboard(true)}>Atualizar</Button>
      </div> : null}
      <div className="hidden">
        <div className="rounded-[32px] bg-gradient-to-br from-[#345CFF] via-[#5B4BFF] to-[#7A54F5] p-5 text-white shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em]">
                <ShieldCheck size={14} />
                Admin
              </div>
              <h1 className="text-2xl font-bold leading-tight">Painel operacional</h1>
              <p className="max-w-[280px] text-sm text-white/80">
                Modere conteúdos, padronize regiões e edite usuários, negócios e eventos.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                void (activeSection === 'analytics' ? loadAnalytics(selectedAnalyticsUserId) : loadDashboard(true))
              }
              disabled={refreshing || loading || analyticsLoading}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white transition hover:bg-white/20 disabled:opacity-60"
              aria-label="Atualizar painel admin"
            >
              <RefreshCcw size={18} className={refreshing || analyticsLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-white/12 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
                Aguardando revisão
              </p>
              <p className="mt-2 text-3xl font-bold">{totalPending}</p>
            </div>
            <div className="rounded-3xl bg-white/12 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
                Responsável logado
              </p>
              <p className="mt-2 text-sm font-bold leading-tight">{user.name}</p>
              <p className="text-xs text-white/70">{user.email || 'Administrador'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="hidden">
          {loading && !dashboard
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-[104px] animate-pulse rounded-3xl bg-white shadow-sm" />
              ))
            : statsCards.map((card) => (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => setActiveSection(card.section)}
                  className="rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${card.accent}`}>
                    {card.icon}
                  </div>
                  <p className="mt-4 text-2xl font-bold text-slate-900">{card.value}</p>
                  <p className="text-xs font-medium text-slate-500">{card.label}</p>
                </button>
              ))}
        </div>

        <div className="hidden">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Seção do painel
          </label>
          <select
            value={activeSection}
            onChange={(event) =>
              setActiveSection(
                event.target.value as
                  | 'moderation'
                  | 'ads'
                  | 'imports'
                  | 'banners'
                  | 'regions'
                  | 'businesses'
                  | 'events'
                  | 'users'
                  | 'suggestions'
                  | 'analytics',
              )
            }
            className="theme-outline-ring h-11 w-full appearance-none rounded-full border-2 border-border bg-surface px-4 text-body-sm font-semibold text-foreground outline-none"
          >
            {sectionTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label} ({tab.count})
              </option>
            ))}
          </select>
        </div>

        <div className="hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Resumo do analytics</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {selectedTab.label}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {analyticsHighlightData.map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{item.value}</p>
                <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-[#345CFF] to-[#7A54F5]"
                    style={{ width: `${Math.max((item.value / analyticsMaxValue) * 100, 8)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {activeSection === 'regions' ? (
          <section className="space-y-3">
          <div className="flex items-center justify-between"><SectionHeader title="Gestão de regiões" count={dashboard?.stats.totalRegions ?? 0} /><Button size="sm" iconLeft={<Plus size={15} />} onClick={() => { resetRegionForm(); setRegionModalOpen(true); }}>Nova regiao</Button></div>
          <Modal open={regionModalOpen} onClose={resetRegionForm} title={editingRegionKey ? 'Editar regiao' : 'Nova regiao'} description="O cadastro alimenta onboarding, perfil e filtros locais." className="max-w-xl">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-700">
                  {editingRegionKey ? 'Editar regiao' : 'Nova regiao'}
                </p>
                <p className="text-xs text-slate-400">
                  O cadastro abaixo alimenta onboarding, perfil e filtros locais.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormInput
                className="col-span-2"
                value={regionForm.label}
                onChange={(value) => setRegionForm((current) => ({ ...current, label: value }))}
                placeholder="Nome da regiao"
              />
              <FormInput
                value={regionForm.city}
                onChange={(value) => setRegionForm((current) => ({ ...current, city: value }))}
                placeholder="Cidade"
              />
              <FormInput
                value={regionForm.state}
                onChange={(value) =>
                  setRegionForm((current) => ({ ...current, state: value.toUpperCase() }))
                }
                placeholder="Estado"
              />
              <FormInput
                value={regionForm.lat}
                onChange={(value) => setRegionForm((current) => ({ ...current, lat: value }))}
                placeholder="Latitude"
              />
              <FormInput
                value={regionForm.lng}
                onChange={(value) => setRegionForm((current) => ({ ...current, lng: value }))}
                placeholder="Longitude"
              />
              {!editingRegionKey ? (
                <FormInput
                  className="col-span-2"
                  value={regionForm.key}
                  onChange={(value) => setRegionForm((current) => ({ ...current, key: value }))}
                  placeholder="Chave opcional (ex: miami-fl)"
                />
              ) : (
                <div className="col-span-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Chave da regiao: <span className="font-bold text-slate-700">{editingRegionKey}</span>
                </div>
              )}
              <FormInput
                className="col-span-2"
                value={regionForm.aliases}
                onChange={(value) => setRegionForm((current) => ({ ...current, aliases: value }))}
                placeholder="Aliases separados por virgula"
              />
            </div>

            <label className="inline-flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={regionForm.isActive}
                onChange={(event) =>
                  setRegionForm((current) => ({ ...current, isActive: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 theme-text theme-ring"
              />
              Regiao ativa para novos usuarios e novos cadastros
            </label>

            <button
              type="button"
              onClick={() => void submitRegion()}
              disabled={
                processingKey === 'region:create' ||
                processingKey === `region:${editingRegionKey}:save`
              }
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl theme-bg px-4 text-sm font-bold text-white shadow-md disabled:opacity-60"
            >
              {editingRegionKey ? <PencilLine size={16} /> : <Plus size={16} />}
              {editingRegionKey
                ? processingKey === `region:${editingRegionKey}:save`
                  ? 'Salvando regiao...'
                  : 'Salvar alteracoes'
                : processingKey === 'region:create'
                  ? 'Criando regiao...'
                  : 'Cadastrar regiao'}
            </button>
          </div>
          </Modal>
          </section>
        ) : null}

        {activeSection === 'imports' ? (
          <section className="space-y-4">
            <SectionHeader
              title="Importacao em massa"
              count={
                importPreview
                  ? importPreview.summary.regions +
                    importPreview.summary.businesses +
                    importPreview.summary.events
                  : 0
              }
            />
            <SupportText text="Baixe o modelo XLSX, preencha as abas Regioes, Negocios e Eventos, valide o arquivo e confirme apenas quando nao houver erros." />

            <div className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl theme-soft-surface theme-text">
                  <FileSpreadsheet size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800">Modelo oficial</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    O arquivo inclui instrucoes, exemplos e listas para regioes existentes. Nao renomeie abas ou cabecalhos.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <a
                  href="/api/admin/import/template"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  <Download size={16} />
                  Baixar modelo XLSX
                </a>
                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl theme-bg px-4 text-sm font-bold text-white transition theme-bg-hover">
                  <Upload size={16} />
                  Validar arquivo preenchido
                  <input
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="sr-only"
                    disabled={processingKey !== null}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.target.value = '';
                      void submitImportPreview(file);
                    }}
                  />
                </label>
              </div>

              {importFileName ? (
                <p className="mt-4 text-xs font-medium text-slate-400">
                  Ultimo arquivo validado: <span className="text-slate-600">{importFileName}</span>
                </p>
              ) : null}
            </div>

            {processingKey === 'import:preview' ? (
              <div className="h-[160px] animate-pulse rounded-3xl bg-white shadow-sm" />
            ) : null}

            {importPreview ? (
              <div className="space-y-3 rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="grid grid-cols-3 gap-3">
                  <ImportMetric label="Regioes" value={importPreview.summary.regions} />
                  <ImportMetric label="Negocios" value={importPreview.summary.businesses} />
                  <ImportMetric label="Eventos" value={importPreview.summary.events} />
                </div>

                {importPreview.errors.length > 0 ? (
                  <div className="rounded-3xl border border-red-100 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <CircleAlert size={18} className="mt-0.5 shrink-0 text-red-700" />
                      <div>
                        <p className="text-sm font-bold text-red-800">
                          Corrija {importPreview.errors.length} erro(s) antes de importar
                        </p>
                        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                          {importPreview.errors.slice(0, 40).map((item, index) => (
                            <p key={`${item.sheet}-${item.row}-${item.field}-${index}`} className="text-sm text-red-700">
                              {item.sheet}, linha {item.row}, campo {item.field}: {item.message}
                            </p>
                          ))}
                          {importPreview.errors.length > 40 ? (
                            <p className="text-sm font-bold text-red-700">
                              Mais {importPreview.errors.length - 40} erro(s) ocultos.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                    Arquivo pronto para importacao. A confirmacao criara/atualizara regioes e criara novos negocios e eventos.
                  </div>
                )}

                <div className="flex gap-2">
                  <ActionButton
                    label="Confirmar importacao"
                    tone="primary"
                    disabled={processingKey !== null || importPreview.errors.length > 0}
                    loading={processingKey === 'import:commit'}
                    onClick={() => void confirmImport()}
                  />
                  <ActionButton
                    label="Limpar previa"
                    tone="neutral"
                    disabled={processingKey !== null}
                    onClick={() => {
                      setImportPreview(null);
                      setImportFileName(null);
                    }}
                  />
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeSection === 'banners' ? (
          <BannerManagementSection
            banners={dashboard?.banners ?? []}
            loading={loading && !dashboard}
            onRefresh={() => loadDashboard(true)}
            onError={setError}
            onMessage={setMessage}
          />
        ) : null}

        {activeSection === 'regions' ? (
          <div className="space-y-3">
          {sortedRegions.length > ADMIN_LIST_PREVIEW_LIMIT ? (
            <div className="flex justify-end">
              <SectionListToggle
                expanded={expandedSections.regions}
                total={sortedRegions.length}
                onToggle={() =>
                  setExpandedSections((current) => ({
                    ...current,
                    regions: !current.regions,
                  }))
                }
              />
            </div>
          ) : null}
          {loading && !dashboard
            ? Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="h-[184px] animate-pulse rounded-3xl bg-white shadow-sm" />
              ))
            : null}
          {visibleRegions.map((region) => (
            <div key={region.key} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold theme-text">{region.label}</p>
                    <StatusBadge label={region.isActive ? 'Ativa' : 'Inativa'} tone={region.isActive ? 'success' : 'neutral'} />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    {region.key}
                  </p>
                </div>
                <MapPinned size={18} className="text-slate-300" />
              </div>
              <div className="mt-4 space-y-1 text-sm text-slate-600">
                <p>
                  {region.city}, {region.state}
                </p>
                <p>
                  Lat {region.lat} | Lng {region.lng}
                </p>
                <p>Atualizada em {formatDateTime(region.updatedAt)}</p>
              </div>
              {region.aliases.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {region.aliases.map((alias) => (
                    <span
                      key={`${region.key}-${alias}`}
                      className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 flex gap-2">
                <ActionButton
                  label="Editar"
                  tone="neutral"
                  disabled={processingKey !== null}
                  onClick={() => startRegionEdit(region)}
                />
                <ActionButton
                  label={region.isActive ? 'Desativar' : 'Ativar'}
                  tone={region.isActive ? 'danger' : 'primary'}
                  disabled={processingKey !== null}
                  loading={processingKey === `region:${region.key}:toggle`}
                  onClick={() => void toggleRegionStatus(region)}
                />
              </div>
            </div>
          ))}
          {dashboard && dashboard.regions.length === 0 ? (
            <EmptyState text="Nenhuma regiao cadastrada ainda." />
          ) : null}
          </div>
        ) : null}

        {activeSection === 'moderation' ? (
          <>
        <GroupReportsSection />
        <ModerationSection
          title="Negocios em aprovacao"
          count={dashboard?.pendingBusinesses.length ?? 0}
          emptyLabel="Nenhum negocio aguardando revisao."
          loading={loading && !dashboard}
        >
          {dashboard?.pendingBusinesses.map((business) => (
            <QueueCard
              key={business.id}
              title={business.name}
              subtitle={business.category}
              lines={[
                business.locationLabel || business.address,
                `Criado por ${business.createdBy.name || business.createdBy.email || 'Usuario'}`,
                `Enviado em ${formatDateTime(business.createdAt)}`,
              ]}
            >
              <ActionButton
                label="Aprovar"
                tone="primary"
                disabled={processingKey !== null}
                loading={processingKey === `business:${business.id}:approve`}
                onClick={() => void submitBusinessReview(business.id, 'approve')}
              />
              <ActionButton
                label="Rejeitar"
                tone="danger"
                disabled={processingKey !== null}
                loading={processingKey === `business:${business.id}:reject`}
                onClick={() => void submitBusinessReview(business.id, 'reject')}
              />
            </QueueCard>
          ))}
        </ModerationSection>

        <ModerationSection
          title="Eventos em aprovacao"
          count={dashboard?.pendingEvents.length ?? 0}
          emptyLabel="Nenhum evento aguardando revisao."
          loading={loading && !dashboard}
        >
          {dashboard?.pendingEvents.map((event) => (
            <QueueCard
              key={event.id}
              title={event.title}
              subtitle={event.venueName}
              lines={[
                event.locationLabel,
                `Comeca em ${formatDateTime(event.startsAt)}`,
                `Enviado por ${event.createdBy.name || event.createdBy.email || 'Usuario'}`,
              ]}
            >
              <ActionButton
                label="Publicar"
                tone="primary"
                disabled={processingKey !== null}
                loading={processingKey === `event:${event.id}:approve`}
                onClick={() => void submitEventReview(event.id, 'approve')}
              />
              <ActionButton
                label="Rejeitar"
                tone="danger"
                disabled={processingKey !== null}
                loading={processingKey === `event:${event.id}:reject`}
                onClick={() => void submitEventReview(event.id, 'reject')}
              />
            </QueueCard>
          ))}
        </ModerationSection>

        <ModerationSection
          title="Posts em revisao"
          count={dashboard?.pendingPosts.length ?? 0}
          emptyLabel="Nenhuma publicacao aguardando moderacao."
          loading={loading && !dashboard}
        >
          {dashboard?.pendingPosts.map((post) => (
            <div key={post.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <img
                  src={post.author.image || `https://picsum.photos/seed/${post.author.id}/100`}
                  alt={post.author.name || 'Autor'}
                  className="h-11 w-11 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold theme-text">
                    {post.author.name || 'Usuario da comunidade'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {post.locationLabel} | {formatDateTime(post.createdAt)}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">
                    {summarize(post.content)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <ActionButton
                  label="Aprovar"
                  tone="primary"
                  disabled={processingKey !== null}
                  loading={processingKey === `post:${post.id}:approve`}
                  onClick={() => void submitPostReview(post.id, 'approve')}
                />
                <ActionButton
                  label="Remover"
                  tone="danger"
                  disabled={processingKey !== null}
                  loading={processingKey === `post:${post.id}:remove`}
                  onClick={() => void submitPostReview(post.id, 'remove')}
                />
              </div>
            </div>
          ))}
        </ModerationSection>
          </>
        ) : null}

        {activeSection === 'businesses' ? (
          <section className="space-y-3">
          <SectionHeader title="Negocios cadastrados" count={filteredBusinesses.length} />
          <SupportText text="Lista operacional dos ultimos negocios para ajuste de dados, imagem, regiao e status." />
          <SearchFilterInput
            value={businessSearch}
            onChange={setBusinessSearch}
            placeholder="Filtrar negocios por nome, slug, categoria ou regiao"
          />
          {!deferredBusinessSearch.trim() && filteredBusinesses.length > ADMIN_LIST_PREVIEW_LIMIT ? (
            <div className="flex justify-end">
              <SectionListToggle
                expanded={expandedSections.businesses}
                total={filteredBusinesses.length}
                onToggle={() =>
                  setExpandedSections((current) => ({
                    ...current,
                    businesses: !current.businesses,
                  }))
                }
              />
            </div>
          ) : null}
          {loading && !dashboard ? (
            <LoadingCards />
          ) : dashboard && filteredBusinesses.length > 0 ? (
            <div className="space-y-3">
              {visibleBusinesses.map((business) => (
                <div key={business.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <img
                      src={business.imageUrl || `https://picsum.photos/seed/${business.id}/200`}
                      alt={business.name}
                      className="h-20 w-20 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-bold theme-text">{business.name}</p>
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                            {business.category}
                          </p>
                        </div>
                        <StatusBadge label={business.status} tone={getBusinessStatusTone(business.status)} />
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        <p>{business.locationLabel}</p>
                        <p>{business.address}</p>
                        <p>/negocios/{business.slug}</p>
                        <p>
                          Visibilidade: {formatVisibilityScopeLabel(business.visibilityScope)}
                          {business.visibilityRegion?.label ? ` (${business.visibilityRegion.label})` : ''}
                        </p>
                        <p>
                          Responsavel: {business.createdBy.name || business.createdBy.email || 'Usuario'}
                        </p>
                        <p>Atualizado em {formatDateTime(business.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <ActionButton
                      label={editingBusinessId === business.id ? 'Fechar' : 'Editar'}
                      tone="neutral"
                      disabled={processingKey !== null}
                      onClick={() =>
                        editingBusinessId === business.id ? resetBusinessForm() : startBusinessEdit(business)
                      }
                    />
                  </div>

                  {editingBusinessId === business.id ? (
                    <Modal open onClose={resetBusinessForm} title="Editar negocio" description={business.name} className="max-w-3xl">
                    <div className="max-h-[72vh] space-y-3 overflow-y-auto pr-1">
                      <FormInput
                        value={businessForm.name}
                        onChange={(value) => setBusinessForm((current) => ({ ...current, name: value }))}
                        placeholder="Nome do negocio"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FormInput
                          value={businessForm.category}
                          onChange={(value) => setBusinessForm((current) => ({ ...current, category: value }))}
                          placeholder="Categoria"
                        />
                        <FormSelect
                          value={businessForm.status}
                          onChange={(value) =>
                            setBusinessForm((current) => ({ ...current, status: value as BusinessStatus }))
                          }
                          options={businessStatusOptions}
                        />
                      </div>
                      <FormTextarea
                        value={businessForm.description}
                        onChange={(value) => setBusinessForm((current) => ({ ...current, description: value }))}
                        placeholder="Descricao"
                      />
                      <FormInput
                        value={businessForm.address}
                        onChange={(value) => setBusinessForm((current) => ({ ...current, address: value }))}
                        placeholder="Endereco"
                      />
                      <RegionSelector
                        value={businessForm.regionKey}
                        onChange={(region) =>
                          setBusinessForm((current) => ({ ...current, regionKey: region.key }))
                        }
                        hint="Use somente regioes cadastradas para manter o catalogo padronizado."
                      />
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FormSelect
                          value={businessForm.visibilityScope}
                          onChange={(value) =>
                            setBusinessForm((current) => ({
                              ...current,
                              visibilityScope: value as VisibilityScopeValue,
                              visibilityRegionKey:
                                value === 'SPECIFIC_REGION' ? current.visibilityRegionKey : '',
                            }))
                          }
                          options={visibilityScopeOptions}
                        />
                        {businessForm.visibilityScope === 'SPECIFIC_REGION' ? (
                          <RegionSelector
                            value={businessForm.visibilityRegionKey}
                            onChange={(region) =>
                              setBusinessForm((current) => ({
                                ...current,
                                visibilityRegionKey: region.key,
                              }))
                            }
                            hint="Defina a regiao exata onde este negocio deve aparecer."
                          />
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                            {businessForm.visibilityScope === 'GLOBAL'
                              ? 'Este negocio podera aparecer para usuarios de qualquer regiao.'
                              : 'Este negocio aparece para usuarios cuja regiao coincide com a regiao cadastrada acima.'}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormInput
                          value={businessForm.phone}
                          onChange={(value) =>
                            setBusinessForm((current) => ({
                              ...current,
                              phone: formatLoosePhoneInput(value),
                            }))
                          }
                          placeholder="Telefone"
                        />
                        <FormInput
                          value={businessForm.whatsapp}
                          onChange={(value) =>
                            setBusinessForm((current) => ({
                              ...current,
                              whatsapp: formatLoosePhoneInput(value),
                            }))
                          }
                          placeholder="WhatsApp"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormInput
                          value={businessForm.website}
                          onChange={(value) => setBusinessForm((current) => ({ ...current, website: value }))}
                          placeholder="Website"
                        />
                        <FormInput
                          value={businessForm.instagram}
                          onChange={(value) =>
                            setBusinessForm((current) => ({ ...current, instagram: value }))
                          }
                          placeholder="Instagram"
                        />
                      </div>
                      <CloudinaryImageField
                        value={businessForm.imageUrl}
                        onChange={(value) =>
                          setBusinessForm((current) => ({ ...current, imageUrl: value }))
                        }
                        folder="businesses"
                        placeholder="Link da imagem"
                        hint="Envie a imagem pela Cloudinary ou cole uma URL publica."
                      />
                      <ImageGalleryField
                        value={businessForm.galleryUrls}
                        onChange={(value) =>
                          setBusinessForm((current) => ({ ...current, galleryUrls: value }))
                        }
                        folder="businesses"
                        hint="Use a galeria para mostrar ambiente, servicos e produtos do negocio."
                      />
                      <div className="flex gap-2">
                        <ActionButton
                          label="Salvar negocio"
                          tone="primary"
                          disabled={processingKey !== null}
                          loading={processingKey === `business:${business.id}:save`}
                          onClick={() => void submitBusinessUpdate()}
                        />
                        <ActionButton
                          label="Cancelar"
                          tone="neutral"
                          disabled={processingKey !== null}
                          onClick={resetBusinessForm}
                        />
                      </div>
                    </div>
                    </Modal>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Nenhum negocio encontrado para gestao." />
          )}
          </section>
        ) : null}

        {activeSection === 'events' ? (
          <section className="space-y-3">
          <SectionHeader title="Eventos cadastrados" count={filteredEvents.length} />
          <SupportText text="Edite dados da agenda, imagem, links e regiao dos ultimos eventos." />
          <SearchFilterInput
            value={eventSearch}
            onChange={setEventSearch}
            placeholder="Filtrar eventos por titulo, slug, local ou regiao"
          />
          {!deferredEventSearch.trim() && filteredEvents.length > ADMIN_LIST_PREVIEW_LIMIT ? (
            <div className="flex justify-end">
              <SectionListToggle
                expanded={expandedSections.events}
                total={filteredEvents.length}
                onToggle={() =>
                  setExpandedSections((current) => ({
                    ...current,
                    events: !current.events,
                  }))
                }
              />
            </div>
          ) : null}
          {loading && !dashboard ? (
            <LoadingCards />
          ) : dashboard && filteredEvents.length > 0 ? (
            <div className="space-y-3">
              {visibleEvents.map((event) => (
                <div key={event.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <img
                      src={event.imageUrl || `https://picsum.photos/seed/${event.id}/200`}
                      alt={event.title}
                      className="h-20 w-20 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-bold theme-text">{event.title}</p>
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                            {event.venueName}
                          </p>
                        </div>
                        <StatusBadge label={event.status} tone={getEventStatusTone(event.status)} />
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        <p>{event.locationLabel}</p>
                        <p>/eventos/{event.slug}</p>
                        <p>Inicio: {formatDateTime(event.startsAt)}</p>
                        <p>
                          Visibilidade: {formatVisibilityScopeLabel(event.visibilityScope)}
                          {event.visibilityRegion?.label ? ` (${event.visibilityRegion.label})` : ''}
                        </p>
                        <p>
                          Responsavel: {event.createdBy.name || event.createdBy.email || 'Usuario'}
                        </p>
                        <p>Atualizado em {formatDateTime(event.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <ActionButton
                      label={editingEventId === event.id ? 'Fechar' : 'Editar'}
                      tone="neutral"
                      disabled={processingKey !== null}
                      onClick={() => (editingEventId === event.id ? resetEventForm() : startEventEdit(event))}
                    />
                  </div>

                  {editingEventId === event.id ? (
                    <Modal open onClose={resetEventForm} title="Editar evento" description={event.title} className="max-w-3xl">
                    <div className="max-h-[72vh] space-y-3 overflow-y-auto pr-1">
                      <FormInput
                        value={eventForm.title}
                        onChange={(value) => setEventForm((current) => ({ ...current, title: value }))}
                        placeholder="Titulo do evento"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FormInput
                          value={eventForm.venueName}
                          onChange={(value) =>
                            setEventForm((current) => ({ ...current, venueName: value }))
                          }
                          placeholder="Local"
                        />
                        <FormSelect
                          value={eventForm.status}
                          onChange={(value) =>
                            setEventForm((current) => ({ ...current, status: value as EventStatus }))
                          }
                          options={eventStatusOptions}
                        />
                      </div>
                      <FormTextarea
                        value={eventForm.description}
                        onChange={(value) =>
                          setEventForm((current) => ({ ...current, description: value }))
                        }
                        placeholder="Descricao"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FormInput
                          type="datetime-local"
                          value={eventForm.startsAt}
                          onChange={(value) =>
                            setEventForm((current) => ({ ...current, startsAt: value }))
                          }
                          placeholder="Inicio"
                        />
                        <FormInput
                          type="datetime-local"
                          value={eventForm.endsAt}
                          onChange={(value) =>
                            setEventForm((current) => ({ ...current, endsAt: value }))
                          }
                          placeholder="Fim"
                        />
                      </div>
                      <p className="text-xs font-medium text-slate-400">
                        Use o seletor para escolher data e horario.
                      </p>
                      <RegionSelector
                        value={eventForm.regionKey}
                        onChange={(region) =>
                          setEventForm((current) => ({ ...current, regionKey: region.key }))
                        }
                        hint="Use somente regioes do catalogo para padronizar a agenda."
                      />
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FormSelect
                          value={eventForm.visibilityScope}
                          onChange={(value) =>
                            setEventForm((current) => ({
                              ...current,
                              visibilityScope: value as VisibilityScopeValue,
                              visibilityRegionKey:
                                value === 'SPECIFIC_REGION' ? current.visibilityRegionKey : '',
                            }))
                          }
                          options={visibilityScopeOptions}
                        />
                        {eventForm.visibilityScope === 'SPECIFIC_REGION' ? (
                          <RegionSelector
                            value={eventForm.visibilityRegionKey}
                            onChange={(region) =>
                              setEventForm((current) => ({
                                ...current,
                                visibilityRegionKey: region.key,
                              }))
                            }
                            hint="Defina a regiao exata onde este evento deve aparecer."
                          />
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                            {eventForm.visibilityScope === 'GLOBAL'
                              ? 'Este evento podera aparecer para usuarios de qualquer regiao.'
                              : 'Este evento aparece para usuarios cuja regiao coincide com a regiao cadastrada acima.'}
                          </div>
                        )}
                      </div>
                      <FormInput
                        value={eventForm.externalUrl}
                        onChange={(value) =>
                          setEventForm((current) => ({ ...current, externalUrl: value }))
                        }
                        placeholder="Link externo"
                      />
                      <CloudinaryImageField
                        value={eventForm.imageUrl}
                        onChange={(value) =>
                          setEventForm((current) => ({ ...current, imageUrl: value }))
                        }
                        folder="events"
                        placeholder="Link da imagem"
                        hint="Envie a imagem pela Cloudinary ou cole uma URL publica."
                      />
                      <ImageGalleryField
                        value={eventForm.galleryUrls}
                        onChange={(value) =>
                          setEventForm((current) => ({ ...current, galleryUrls: value }))
                        }
                        folder="events"
                        hint="Adicione imagens extras para enriquecer a pagina do evento."
                      />
                      <div className="flex gap-2">
                        <ActionButton
                          label="Salvar evento"
                          tone="primary"
                          disabled={processingKey !== null}
                          loading={processingKey === `event:${event.id}:save`}
                          onClick={() => void submitEventUpdate()}
                        />
                        <ActionButton
                          label="Cancelar"
                          tone="neutral"
                          disabled={processingKey !== null}
                          onClick={resetEventForm}
                        />
                      </div>
                    </div>
                    </Modal>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Nenhum evento encontrado para gestao." />
          )}
          </section>
        ) : null}

        {activeSection === 'suggestions' ? (
          <section className="space-y-3">
          <SectionHeader title="Sugestoes recebidas" count={filteredSuggestions.length} />
          <SupportText text="Feedback direto dos usuarios para priorizar novas funcionalidades e melhorias." />
          <SearchFilterInput
            value={suggestionSearch}
            onChange={setSuggestionSearch}
            placeholder="Filtrar sugestoes por texto, usuario, email ou categoria"
          />
          {!deferredSuggestionSearch.trim() && filteredSuggestions.length > ADMIN_LIST_PREVIEW_LIMIT ? (
            <div className="flex justify-end">
              <SectionListToggle
                expanded={expandedSections.suggestions}
                total={filteredSuggestions.length}
                onToggle={() =>
                  setExpandedSections((current) => ({
                    ...current,
                    suggestions: !current.suggestions,
                  }))
                }
              />
            </div>
          ) : null}
          {loading && !dashboard ? (
            <LoadingCards />
          ) : dashboard && filteredSuggestions.length > 0 ? (
            <div className="space-y-3">
              {visibleSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <img
                      src={suggestion.user.image || `https://picsum.photos/seed/${suggestion.user.id}/120`}
                      alt={suggestion.user.name || suggestion.user.email || 'Usuario'}
                      className="h-14 w-14 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-bold theme-text">
                            {suggestion.user.name || 'Usuario da plataforma'}
                          </p>
                          <p className="text-sm font-medium text-slate-500">
                            @{suggestion.user.username || 'sem-username'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge label={formatSuggestionCategory(suggestion.category)} tone="neutral" />
                          <StatusBadge
                            label={suggestion.status === 'REVIEWED' ? 'Revisada' : 'Nova'}
                            tone={getSuggestionStatusTone(suggestion.status)}
                          />
                        </div>
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        <p>{suggestion.user.email || 'Sem email'}</p>
                        <p>{suggestion.user.locationLabel || 'Sem regiao definida'}</p>
                        <p>Recebida em {formatDateTime(suggestion.createdAt)}</p>
                      </div>
                      <div className="mt-4 rounded-3xl bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-700">
                        {suggestion.message}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <ActionButton
                      label={suggestion.status === 'REVIEWED' ? 'Reabrir' : 'Marcar revisada'}
                      tone={suggestion.status === 'REVIEWED' ? 'neutral' : 'primary'}
                      disabled={processingKey !== null}
                      loading={
                        processingKey ===
                        `suggestion:${suggestion.id}:${(suggestion.status === 'REVIEWED' ? 'new' : 'reviewed')}`
                      }
                      onClick={() =>
                        void updateSuggestionStatus(
                          suggestion,
                          suggestion.status === 'REVIEWED' ? 'NEW' : 'REVIEWED',
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Nenhuma sugestao encontrada para essa busca." />
          )}
          </section>
        ) : null}

        {activeSection === 'analytics' ? (
          <AdminAnalyticsSection
            data={analytics}
            loading={analyticsLoading}
            days={analyticsDays}
            regionFilter={analyticsRegionFilter}
            regions={dashboard?.regions ?? []}
            onDaysChange={setAnalyticsDays}
            onRegionChange={setAnalyticsRegionFilter}
            onRefresh={() => void loadAnalytics(selectedAnalyticsUserId)}
            onClearUser={() => setSelectedAnalyticsUserId(null)}
          />
        ) : null}

        {activeSection === 'users' ? (
          <section className="space-y-3">
          <SectionHeader title="Usuarios" count={filteredUsers.length} />
          <SupportText text="Visualize perfis, ajuste papel, regiao, nome publico e exclua usuarios quando necessario." />
          <SearchFilterInput
            value={userSearch}
            onChange={setUserSearch}
            placeholder="Filtrar usuarios por nome, username, email ou regiao"
          />
          {!deferredUserSearch.trim() && filteredUsers.length > ADMIN_LIST_PREVIEW_LIMIT ? (
            <div className="flex justify-end">
              <SectionListToggle
                expanded={expandedSections.users}
                total={filteredUsers.length}
                onToggle={() =>
                  setExpandedSections((current) => ({
                    ...current,
                    users: !current.users,
                  }))
                }
              />
            </div>
          ) : null}
          {loading && !dashboard ? (
            <LoadingCards />
          ) : dashboard && filteredUsers.length > 0 ? (
            <div className="space-y-3">
              {visibleUsers.map((managedUser) => (
                <div key={managedUser.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40">
                  <div className="flex items-start gap-4">
                    <img
                      src={managedUser.image || `https://picsum.photos/seed/${managedUser.id}/120`}
                      alt={managedUser.name || managedUser.email || 'Usuario'}
                      className="h-14 w-14 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-bold theme-text">
                            {managedUser.name || 'Usuario sem nome'}
                          </p>
                          <p className="text-sm font-medium text-slate-500">
                            @{managedUser.username || 'sem-username'}
                          </p>
                        </div>
                        <StatusBadge label={managedUser.role} tone="neutral" />
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        <p>{managedUser.email || 'Sem email'}</p>
                        <p>{managedUser.locationLabel || 'Sem regiao definida'}</p>
                        <p>
                          Cadastro {managedUser.onboardingCompleted ? 'concluido' : 'pendente'}
                        </p>
                        <p>Atualizado em {formatDateTime(managedUser.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <ActionButton
                      label={editingUserId === managedUser.id ? 'Fechar' : 'Editar'}
                      tone="neutral"
                      disabled={processingKey !== null}
                      onClick={() => (editingUserId === managedUser.id ? resetUserForm() : startUserEdit(managedUser))}
                    />
                    <ActionButton
                      label="Analytics"
                      tone="primary"
                      disabled={processingKey !== null}
                      onClick={() => openUserAnalytics(managedUser.id)}
                    />
                    <ActionButton
                      label="Excluir"
                      tone="danger"
                      disabled={processingKey !== null || managedUser.id === user.id}
                      onClick={() => setDeletingUser(managedUser)}
                    />
                  </div>

                  {editingUserId === managedUser.id ? (
                    <Modal open onClose={resetUserForm} title="Editar usuario" description={managedUser.name || managedUser.email || 'Usuario'} className="max-w-2xl">
                    <div className="max-h-[72vh] space-y-3 overflow-y-auto pr-1">
                      <FormInput
                        value={userForm.name}
                        onChange={(value) => setUserForm((current) => ({ ...current, name: value }))}
                        placeholder="Nome completo"
                      />
                      <FormInput
                        value={userForm.username}
                        onChange={(value) =>
                          setUserForm((current) => ({
                            ...current,
                            username: normalizeUsernameInput(value),
                          }))
                        }
                        placeholder="Nome publico"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FormInput
                          value={userForm.email}
                          onChange={(value) => setUserForm((current) => ({ ...current, email: value }))}
                          placeholder="Email"
                        />
                        <FormInput
                          value={userForm.phone}
                          onChange={(value) =>
                            setUserForm((current) => ({
                              ...current,
                              phone: formatLoosePhoneInput(value),
                            }))
                          }
                          placeholder="Telefone"
                        />
                      </div>
                      <CloudinaryImageField
                        value={userForm.image}
                        onChange={(value) =>
                          setUserForm((current) => ({ ...current, image: value }))
                        }
                        folder="profiles"
                        placeholder="Link da foto do usuario"
                        hint="Envie a foto pela Cloudinary ou cole uma URL publica."
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FormSelect
                          value={userForm.role}
                          onChange={(value) =>
                            setUserForm((current) => ({ ...current, role: value as UserRoleValue }))
                          }
                          options={userRoleOptions}
                        />
                        <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
                          <input
                            type="checkbox"
                            checked={userForm.onboardingCompleted}
                            onChange={(event) =>
                              setUserForm((current) => ({
                                ...current,
                                onboardingCompleted: event.target.checked,
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300 theme-text theme-ring"
                          />
                          Cadastro concluido
                        </label>
                      </div>
                      <RegionSelector
                        value={userForm.regionKey}
                        onChange={(region) =>
                          setUserForm((current) => ({ ...current, regionKey: region.key }))
                        }
                        hint="A regiao do usuario controla feed, negocios e eventos priorizados."
                      />
                      <div className="flex gap-2">
                        <ActionButton
                          label="Salvar usuario"
                          tone="primary"
                          disabled={processingKey !== null}
                          loading={processingKey === `user:${managedUser.id}:save`}
                          onClick={() => void requestUserUpdateConfirmation(managedUser)}
                        />
                        <ActionButton
                          label="Cancelar"
                          tone="neutral"
                          disabled={processingKey !== null}
                          onClick={resetUserForm}
                        />
                      </div>
                    </div>
                    </Modal>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Nenhum usuario encontrado para gestao." />
          )}
          </section>
        ) : null}
      </div>

      {confirmationDialog ? (
        <ConfirmationDialog
          title={confirmationDialog.title}
          description={confirmationDialog.description}
          confirmLabel={confirmationDialog.confirmLabel}
          tone={confirmationDialog.tone}
          disabled={processingKey !== null}
          onCancel={() => setConfirmationDialog(null)}
          onConfirm={async () => {
            await confirmationDialog.onConfirm();
            setConfirmationDialog(null);
          }}
        />
      ) : null}
      {deletingUser ? (
        <UserDeletionModal
          target={deletingUser}
          onClose={() => setDeletingUser(null)}
          onDeleted={async () => {
            if (editingUserId === deletingUser.id) resetUserForm();
            await loadDashboard(true);
          }}
        />
      ) : null}
    </div>
  );
};

const Feedback: React.FC<{ tone: 'error' | 'success'; text: string }> = ({ tone, text }) => (
  <div
    className={`flex items-start gap-3 rounded-3xl px-4 py-4 text-sm ${
      tone === 'error'
        ? 'border border-red-100 bg-red-50 text-red-700'
        : 'border border-emerald-100 bg-emerald-50 text-emerald-700'
    }`}
  >
    {tone === 'error' ? (
      <CircleAlert size={18} className="mt-0.5 shrink-0" />
    ) : (
      <BadgeCheck size={18} className="mt-0.5 shrink-0" />
    )}
    <p>{text}</p>
  </div>
);

const SectionHeader: React.FC<{ title: string; count: number }> = ({ title, count }) => (
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-bold text-slate-950">{title}</h2>
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
      {count}
    </span>
  </div>
);

const SupportText: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-sm text-slate-500">{text}</p>
);

const ImportMetric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-4 text-center">
    <p className="text-2xl font-bold text-slate-900">{value}</p>
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
  </div>
);

const SectionListToggle: React.FC<{
  expanded: boolean;
  total: number;
  limit?: number;
  onToggle: () => void;
}> = ({ expanded, total, limit = ADMIN_LIST_PREVIEW_LIMIT, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-[#2B5DF5] hover:text-[#2B5DF5]"
  >
    {expanded ? 'Mostrar menos' : `Ver todos (${total})`}
    {!expanded ? (
      <span className="ml-2 text-slate-400">mostrando {Math.min(total, limit)}</span>
    ) : null}
  </button>
);

const SearchFilterInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}> = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#2B5DF5] focus:ring-2 focus:ring-blue-100"
    />
  </div>
);

const ModerationSection: React.FC<{
  title: string;
  count: number;
  emptyLabel: string;
  loading: boolean;
  children: React.ReactNode;
}> = ({ title, count, emptyLabel, loading, children }) => (
  <section className="space-y-3">
    <SectionHeader title={title} count={count} />
    {loading ? (
      <LoadingCards />
    ) : count === 0 ? (
      <EmptyState text={emptyLabel} />
    ) : (
      <div className="space-y-3">{children}</div>
    )}
  </section>
);

const QueueCard: React.FC<{
  title: string;
  subtitle: string;
  lines: string[];
  children: React.ReactNode;
}> = ({ title, subtitle, lines, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold theme-text">{title}</p>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{subtitle}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label="PENDENTE" tone="warning" />
        {children}
      </div>
    </div>
  </div>
);

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm font-medium text-slate-500">
    {text}
  </div>
);

const ConfirmationDialog: React.FC<{
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'primary' | 'danger';
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}> = ({ title, description, confirmLabel, tone, disabled = false, onCancel, onConfirm }) => (
  <Modal
    open
    onClose={onCancel}
    title={title}
    description={description}
    footer={
      <>
        <ActionButton
          label="Cancelar"
          tone="neutral"
          disabled={disabled}
          onClick={onCancel}
        />
        <ActionButton
          label={confirmLabel}
          tone={tone}
          disabled={disabled}
          onClick={() => void onConfirm()}
        />
      </>
    }
  />
);

const LoadingCards: React.FC = () => (
  <div className="space-y-3">
    {Array.from({ length: 2 }).map((_, index) => (
      <div key={index} className="h-[152px] animate-pulse rounded-2xl border border-slate-200 bg-white" />
    ))}
  </div>
);

const FormInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  type?: string;
}> = ({ value, onChange, placeholder, className = '', type = 'text' }) => (
  <input
    type={type}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    className={`rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 theme-ring ${className}`}
  />
);

const FormTextarea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}> = ({ value, onChange, placeholder }) => (
  <textarea
    rows={4}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 theme-ring"
  />
);

const FormSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: string[];
}> = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="theme-outline-ring h-11 w-full appearance-none rounded-full border-2 border-border bg-surface px-4 text-body-sm text-foreground outline-none"
  >
    {options.map((option) => (
      <option key={option} value={option}>
        {option}
      </option>
    ))}
  </select>
);

const StatusBadge: React.FC<{
  label: string;
  tone: 'success' | 'danger' | 'warning' | 'neutral';
}> = ({ label, tone }) => (
  <span
    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
      tone === 'success'
        ? 'bg-emerald-50 text-emerald-700'
        : tone === 'danger'
          ? 'bg-red-50 text-red-700'
          : tone === 'warning'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-slate-100 text-slate-600'
    }`}
  >
    {label}
  </span>
);

const ActionButton: React.FC<{
  label: string;
  tone: 'primary' | 'danger' | 'neutral';
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}> = ({ label, tone, disabled = false, loading = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex min-h-9 flex-none items-center justify-center rounded-full px-4 text-sm font-bold transition disabled:opacity-60 ${
      tone === 'primary'
        ? 'bg-[#2B5DF5] text-white hover:bg-[#214bd1]'
        : tone === 'danger'
          ? 'bg-red-50 text-red-700 hover:bg-red-100'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
    }`}
  >
    {loading ? 'Processando...' : label}
  </button>
);

export default AdminPanel;

