import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EmptyNotice } from '@/components/ui/EmptyNotice';
import { useSession } from 'next-auth/react';
import { VerifyPhoneForm } from '../components/app/VerifyPhoneForm';
import { ImageEditMenu } from '@/components/ui/ImageEditMenu';
import { MessagePolicyOptions, type MessagePolicy } from '@/components/profile/MessagePrivacySection';
import { useRouter, useSearchParams } from 'next/navigation';
import { BadgeCheck, CalendarDays, Copy, Globe, Mail, MapPin, PencilLine, Phone, Plus, UserRound, X } from 'lucide-react';
import { useToast } from '../components/feedback/ToastProvider';
import { getClientAppBaseUrl } from '../lib/client-app-url';
import CloudinaryImageField from '../components/forms/CloudinaryImageField';
import ImageGalleryField from '../components/forms/ImageGalleryField';
import RegionSelector from '../components/RegionSelector';
import { ThemeSelector } from '../components/theme/ThemeSelector';
import { LanguageSelector } from '../components/i18n/LanguageSelector';
import { CityAutocomplete } from '../components/ui/CityAutocomplete';
import { formatLoosePhoneInput } from '../lib/forms/phone';
import { normalizeUrlFieldValue } from '../lib/forms/validation';
import { normalizeUsernameInput } from '../lib/username';
import { DEFAULT_AVATAR_URL, handleAvatarError } from '../lib/avatar';
import PersonaModeDropdown from '../components/profile/PersonaModeDropdown';
import ProfessionalModePanel from '../components/profile/ProfessionalModePanel';
import { PersonaMode, ProfessionalProfileSummary, ReferralSummary, User } from '../types';
import type { ProfileInitialData } from '../lib/content-contracts';
import { Modal } from '../components/ui/Modal';
import { ContentColumn } from '../components/ui/ContentColumn';
import { notifyContentUpdated } from '../lib/content-refresh';
import { withUtm } from '@/lib/utm-client';
import { getUserErrorMessage } from '@/lib/user-error';

const PROFILE_GRADIENT_CLASS = 'bg-brand-500';
const PROFESSIONAL_PROFILE_GRADIENT_CLASS = 'bg-navy';

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

type ProfileField = 'name' | 'username' | 'phone' | 'birthCity' | 'age' | 'gender' | 'timeAbroad';

type ProfileState = {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  image: string;
  coverImageUrl: string;
  bio: string;
  interests: string[];
  galleryUrls: string[];
  locationLabel: string;
  regionKey: string;
  gender: '' | 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  age: number | null;
  timeAbroad: '' | 'LESS_THAN_ONE_YEAR' | 'ONE_TO_THREE_YEARS' | 'THREE_TO_FIVE_YEARS' | 'MORE_THAN_FIVE_YEARS';
  birthCity: string;
};

/** Por quanto tempo o rascunho do editor de perfil fica guardado (1 hora). */
const PROFILE_DRAFT_TTL_MS = 60 * 60 * 1000;

const emptyProfessionalProfile: ProfessionalProfileSummary = {
  businessCount: 0,
  eventCount: 0,
  identity: null,
  businesses: [],
  events: [],
};

const buildProfileState = (user: User): ProfileState => ({
  id: user.id,
  name: user.name,
  username: user.username || '',
  email: user.email || '',
  phone: user.phone || '',
  image: user.avatar === DEFAULT_AVATAR_URL ? '' : user.avatar,
  coverImageUrl: user.coverImageUrl || '',
  bio: user.bio || '',
  interests: user.interests || [],
  galleryUrls: user.galleryUrls || [],
  locationLabel: user.location,
  regionKey: user.regionKey || '',
  gender: '',
  age: null,
  timeAbroad: '',
  birthCity: user.birthCity || '',
});

const Profile: React.FC<{
  user: User;
  personaMode: PersonaMode;
  canUseProfessionalMode: boolean;
  onPersonaModeChange: (mode: PersonaMode) => void;
  initialData?: ProfileInitialData;
}> = ({ user, personaMode, canUseProfessionalMode, onPersonaModeChange, initialData }) => {
  const { data: authSession, update } = useSession();
  const phoneVerificationOn = process.env.NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED === 'true';
  const phoneVerified = Boolean(authSession?.user?.phoneVerified);
  const [changingPhone, setChangingPhone] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const initialProfile: ProfileState = initialData?.user
    ? {
        id: initialData.user.id,
        name: initialData.user.name || user.name,
        username: initialData.user.username || '', email: initialData.user.email || '', phone: initialData.user.phone || '',
        image: initialData.user.image || '', coverImageUrl: initialData.user.coverImageUrl || '', bio: initialData.user.bio || '',
        interests: initialData.user.interests, galleryUrls: initialData.user.galleryUrls,
        locationLabel: initialData.user.locationLabel || user.location, regionKey: initialData.user.regionKey || '',
        gender: initialData.user.gender || '', age: initialData.user.age, timeAbroad: initialData.user.timeAbroad || '', birthCity: initialData.user.birthCity || '',
      }
    : buildProfileState(user);
  const [loading, setLoading] = useState(!initialData);
  const [profile, setProfile] = useState<ProfileState>(initialProfile);
  const [professionalProfile, setProfessionalProfile] = useState<ProfessionalProfileSummary>(initialData?.professionalProfile ?? emptyProfessionalProfile);
  const initialDataConsumedRef = React.useRef(false);
  const [requestedEmail, setRequestedEmail] = useState(user.email || '');
  const [requestingEmailChange, setRequestingEmailChange] = useState(false);
  const [referralSummary, setReferralSummary] = useState<ReferralSummary>({ referralUrl: null, registrationCount: 0 });
  const [avatarDraft, setAvatarDraft] = useState('');
  const [coverDraft, setCoverDraft] = useState('');
  const [accountDraft, setAccountDraft] = useState<Pick<ProfileState, 'name' | 'username' | 'email' | 'phone' | 'bio' | 'gender' | 'age' | 'timeAbroad' | 'birthCity'>>({
    name: user.name,
    username: user.username || '',
    email: user.email || '',
    phone: user.phone || '',
    bio: user.bio || '',
    gender: initialProfile.gender,
    age: initialProfile.age,
    timeAbroad: initialProfile.timeAbroad,
    birthCity: initialProfile.birthCity,
  });
  const [interestDrafts, setInterestDrafts] = useState<string[]>(user.interests || []);
  const [interestInput, setInterestInput] = useState('');
  const [galleryDraft, setGalleryDraft] = useState<string[]>(user.galleryUrls || []);
  const [selectedRegionKey, setSelectedRegionKey] = useState(user.regionKey || '');
  const [editing, setEditing] = useState({
    avatar: false,
    cover: false,
    account: false,
    interests: false,
    gallery: false,
    region: false,
    profile: false,
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [profileEditDraft, setProfileEditDraft] = useState<ProfileState | null>(null);
  const [profileErrors, setProfileErrors] = useState<Partial<Record<ProfileField, string>>>({});

  useEffect(() => {
    if (!initialDataConsumedRef.current && initialData) {
      initialDataConsumedRef.current = true;
      setAvatarDraft(initialProfile.image);
      setCoverDraft(initialProfile.coverImageUrl);
      setAccountDraft({ name: initialProfile.name, username: initialProfile.username, email: initialProfile.email, phone: initialProfile.phone, bio: initialProfile.bio, gender: initialProfile.gender, age: initialProfile.age, timeAbroad: initialProfile.timeAbroad, birthCity: initialProfile.birthCity });
      setInterestDrafts(initialProfile.interests);
      setGalleryDraft(initialProfile.galleryUrls);
      setSelectedRegionKey(initialProfile.regionKey);
      return;
    }

    let ignore = false;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/profile', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.user) {
          throw new Error(payload?.error ?? 'Não foi possível carregar seu perfil.');
        }

        if (!ignore) {
          const nextProfile: ProfileState = {
            id: payload.user.id,
            name: payload.user.name || user.name,
            username: payload.user.username || user.username || '',
            email: payload.user.email || user.email || '',
            phone: payload.user.phone || '',
            image: payload.user.image || '',
            coverImageUrl: payload.user.coverImageUrl || '',
            bio: payload.user.bio || '',
            interests: Array.isArray(payload.user.interests) ? payload.user.interests : [],
            galleryUrls: Array.isArray(payload.user.galleryUrls) ? payload.user.galleryUrls : [],
            locationLabel: payload.user.locationLabel || user.location,
            regionKey: payload.user.regionKey || user.regionKey || '',
            gender: payload.user.gender || '',
            age: payload.user.age ?? null,
            timeAbroad: payload.user.timeAbroad || '',
            birthCity: payload.user.birthCity || '',
          };

          setProfile(nextProfile);
          setAvatarDraft(nextProfile.image);
          setCoverDraft(nextProfile.coverImageUrl);
          setAccountDraft({
            name: nextProfile.name,
            username: nextProfile.username,
            email: nextProfile.email,
            phone: nextProfile.phone,
            bio: nextProfile.bio,
            gender: nextProfile.gender,
            age: nextProfile.age,
            timeAbroad: nextProfile.timeAbroad,
            birthCity: nextProfile.birthCity,
          });
          setInterestDrafts(nextProfile.interests);
          setGalleryDraft(nextProfile.galleryUrls);
          setSelectedRegionKey(nextProfile.regionKey);
          setProfessionalProfile({
            businessCount: Number(payload.professionalProfile?.businessCount ?? 0),
            eventCount: Number(payload.professionalProfile?.eventCount ?? 0),
            identity: payload.professionalProfile?.identity ?? null,
            businesses: Array.isArray(payload.professionalProfile?.businesses)
              ? payload.professionalProfile.businesses
              : [],
            events: Array.isArray(payload.professionalProfile?.events)
              ? payload.professionalProfile.events
              : [],
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        if (!ignore) {
          showToast('Não foi possível carregar todos os dados do perfil.', 'error');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, [initialData, showToast, user]);

  useEffect(() => {
    const emailChangeStatus = searchParams?.get('emailChange');
    if (!emailChangeStatus) return;

    if (emailChangeStatus === 'success') {
      void update();
      showToast('Seu email foi confirmado e atualizado com sucesso.', 'success');
    } else {
      showToast('Não foi possível validar esse link de troca de email.', 'error');
    }

    router.replace('/profile');
  }, [router, searchParams, showToast, update]);

  const deepLinkHandled = useRef(false);

  useEffect(() => {
    const editSection = searchParams?.get('edit');

    if (!editSection || loading) {
      return;
    }

    // O parâmetro fica na URL enquanto o editor está aberto; ao fechar, a pessoa volta ao próprio perfil.
    if (deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    if (editSection === 'cover' || editSection === 'region' || editSection === 'profile') {
      openEditProfileModal();
    }
  }, [loading, searchParams]);

  useEffect(() => {
    if (loading || searchParams?.get('mode') !== 'professional' || !canUseProfessionalMode || !professionalProfile.identity) {
      return;
    }

    onPersonaModeChange('professional');
    router.replace('/profile', { scroll: false });
  }, [canUseProfessionalMode, loading, onPersonaModeChange, professionalProfile.identity, router, searchParams]);

  useEffect(() => {
    let ignore = false;

    const loadReferralSummary = async () => {
      try {
        const response = await fetch('/api/referrals/summary', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) return;
        if (!ignore) {
          setReferralSummary({
            referralUrl: payload?.referralUrl ?? null,
            registrationCount: Number(payload?.registrationCount ?? 0),
          });
        }
      } catch (error) {
        console.error('Failed to load referral summary:', error);
      }
    };

    void loadReferralSummary();
    return () => {
      ignore = true;
    };
  }, [profile.username]);

  const publicProfileUrl = useMemo(
    () => `${getClientAppBaseUrl()}/${profile.username || 'seu-perfil'}`,
    [profile.username],
  );

  const saveProfile = async (patch: Partial<ProfileState>, message: string, editKey?: keyof typeof editing): Promise<boolean> => {
    setSavingKey(editKey || 'profile');
    try {
      const nextProfile = { ...profile, ...patch };
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nextProfile.name.trim(),
          username: normalizeUsernameInput(nextProfile.username),
          email: nextProfile.email || undefined,
          phone: nextProfile.phone.trim() || undefined,
          bio: nextProfile.bio.trim() || undefined,
          coverImageUrl: normalizeUrlFieldValue(nextProfile.coverImageUrl),
          galleryUrls: nextProfile.galleryUrls,
          interests: nextProfile.interests,
          gender: nextProfile.gender || undefined,
          age: nextProfile.age ?? undefined,
          timeAbroad: nextProfile.timeAbroad || undefined,
          birthCity: nextProfile.birthCity.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível atualizar seu perfil.');
      const persistedProfile: Partial<ProfileState> = {
        name: payload?.user?.name || nextProfile.name,
        username: payload?.user?.username || normalizeUsernameInput(nextProfile.username),
        email: payload?.user?.email || nextProfile.email,
        phone: payload?.user?.phone || '',
        bio: payload?.user?.bio || '',
        coverImageUrl: payload?.user?.coverImageUrl || '',
        interests: Array.isArray(payload?.user?.interests) ? payload.user.interests : nextProfile.interests,
        galleryUrls: Array.isArray(payload?.user?.galleryUrls) ? payload.user.galleryUrls : nextProfile.galleryUrls,
        gender: payload?.user?.gender || nextProfile.gender,
        age: payload?.user?.age ?? nextProfile.age,
        timeAbroad: payload?.user?.timeAbroad || nextProfile.timeAbroad,
        birthCity: payload?.user?.birthCity || nextProfile.birthCity,
      };

      setProfile((current) => ({ ...current, ...persistedProfile }));
      setAccountDraft({
        name: persistedProfile.name || nextProfile.name,
        username: persistedProfile.username || normalizeUsernameInput(nextProfile.username),
        email: persistedProfile.email || nextProfile.email,
        phone: persistedProfile.phone || '',
        bio: persistedProfile.bio || '',
        gender: persistedProfile.gender || '',
        age: persistedProfile.age ?? null,
        timeAbroad: persistedProfile.timeAbroad || '',
        birthCity: persistedProfile.birthCity || '',
      });
      setCoverDraft(persistedProfile.coverImageUrl || '');
      setInterestDrafts(persistedProfile.interests || []);
      setGalleryDraft(persistedProfile.galleryUrls || []);
      await update();
      notifyContentUpdated({ refreshSession: true });
      if (editKey) setEditing((current) => ({ ...current, [editKey]: false }));
      showToast(message, 'success');
      return true;
    } catch (error) {
      console.error('Failed to save profile:', error);
      showToast(getUserErrorMessage(error, 'Não foi possível salvar o perfil.'), 'error');
      return false;
    } finally {
      setSavingKey(null);
    }
  };

  const saveAvatar = async (value: string = avatarDraft, quiet = false): Promise<boolean> => {
    setSavingKey('avatar');
    try {
      const response = await fetch('/api/profile/image', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: normalizeUrlFieldValue(value) || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível atualizar sua foto.');
      const nextImage = payload?.user?.image || '';
      setProfile((current) => ({ ...current, image: nextImage }));
      setAvatarDraft(nextImage);
      await update();
      notifyContentUpdated({ refreshSession: true });
      setEditing((current) => ({ ...current, avatar: false }));
      if (!quiet) showToast('Foto do perfil atualizada.', 'success');
      return true;
    } catch (error) {
      console.error('Failed to update avatar:', error);
      showToast(getUserErrorMessage(error, 'Não foi possível atualizar sua foto.'), 'error');
      return false;
    } finally {
      setSavingKey(null);
    }
  };

  const requestEmailChange = async () => {
    if (!requestedEmail.trim()) {
      showToast('Informe o novo email para continuar.', 'error');
      return;
    }
    setRequestingEmailChange(true);
    try {
      const response = await fetch('/api/profile/email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: requestedEmail.trim() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível iniciar a troca de email.');
      showToast('Enviamos um link de confirmação para o novo email.', 'success');
    } catch (error) {
      console.error('Failed to request email change:', error);
      showToast(getUserErrorMessage(error, 'Não foi possível iniciar a troca de email.'), 'error');
    } finally {
      setRequestingEmailChange(false);
    }
  };

  const saveRegion = async (regionKey: string = selectedRegionKey, quiet = false): Promise<boolean> => {
    if (!regionKey) {
      showToast('Selecione uma região valida antes de salvar.', 'error');
      return false;
    }
    setSavingKey('region');
    try {
      const response = await fetch('/api/profile/region', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionKey }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível atualizar sua região.');
      setProfile((current) => ({
        ...current,
        regionKey: payload?.user?.regionKey || regionKey,
        locationLabel: payload?.user?.locationLabel || current.locationLabel,
      }));
      await update();
      setEditing((current) => ({ ...current, region: false }));
      if (!quiet) showToast('Região atualizada com sucesso.', 'success');
      return true;
    } catch (error) {
      console.error('Failed to save region:', error);
      showToast(getUserErrorMessage(error, 'Não foi possível atualizar sua região.'), 'error');
      return false;
    } finally {
      setSavingKey(null);
    }
  };

  const addInterest = () => {
    const normalized = interestInput.trim();
    if (!normalized) return;
    if (interestDrafts.includes(normalized)) {
      setInterestInput('');
      return;
    }
    if (interestDrafts.length >= 8) {
      showToast('Você pode usar no máximo 8 interesses.', 'error');
      return;
    }
    setInterestDrafts((current) => [...current, normalized]);
    setInterestInput('');
  };

  const [policyDraft, setPolicyDraft] = useState<MessagePolicy | null>(null);
  const [policySaved, setPolicySaved] = useState<MessagePolicy | null>(null);

  useEffect(() => {
    if (!editing.profile || policySaved) return;
    let ignore = false;
    void fetch('/api/me/message-policy', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (ignore || !payload?.messagePolicy) return;
        setPolicySaved(payload.messagePolicy as MessagePolicy);
        setPolicyDraft(payload.messagePolicy as MessagePolicy);
      })
      .catch(() => undefined);
    return () => { ignore = true; };
  }, [editing.profile, policySaved]);

  /** Rascunho do editor guardado neste aparelho por um tempo, para não perder o que foi digitado se a pessoa sair sem querer. */
  const draftKey = `gringoou:profile-draft:${profile.id}`;
  const [draftRestored, setDraftRestored] = useState(false);

  const readStoredDraft = (): { draft: ProfileState; policy: MessagePolicy | null } | null => {
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { draft?: ProfileState; policy?: MessagePolicy | null; savedAt?: number };
      if (!parsed.draft || !parsed.savedAt || Date.now() - parsed.savedAt > PROFILE_DRAFT_TTL_MS) {
        window.localStorage.removeItem(draftKey);
        return null;
      }
      return { draft: parsed.draft, policy: parsed.policy ?? null };
    } catch {
      return null;
    }
  };

  const clearStoredDraft = () => {
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      /* armazenamento indisponível: segue sem rascunho */
    }
  };

  useEffect(() => {
    if (!editing.profile || !profileEditDraft) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify({ draft: profileEditDraft, policy: policyDraft, savedAt: Date.now() }));
      } catch {
        /* armazenamento indisponível: segue sem rascunho */
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [editing.profile, profileEditDraft, policyDraft, draftKey]);

  const openEditProfileModal = () => {
    const found = readStoredDraft();
    const stored = found && (JSON.stringify(found.draft) !== JSON.stringify(profile) || (found.policy !== null && policySaved !== null && found.policy !== policySaved)) ? found : null;
    setPolicyDraft(stored?.policy ?? policySaved);
    setProfileEditDraft(stored ? { ...profile, ...stored.draft } : profile);
    setDraftRestored(Boolean(stored));
    setProfileErrors({});
    setEditing((c) => ({ ...c, profile: true }));
  };

  /** Fecha mantendo o rascunho (X, Esc ou clique fora). */
  const closeEditProfileModal = () => {
    setProfileEditDraft(null);
    setEditing((c) => ({ ...c, profile: false }));
    if (searchParams?.get('edit') && profile.username) router.replace(`/perfil/${encodeURIComponent(profile.username)}`);
  };

  /** Descarta de propósito: apaga o rascunho guardado. */
  const discardEditProfile = () => {
    clearStoredDraft();
    setDraftRestored(false);
    closeEditProfileModal();
  };

  const resetDraftToSaved = () => {
    clearStoredDraft();
    setDraftRestored(false);
    setProfileEditDraft(profile);
    setPolicyDraft(policySaved);
  };

  const clearProfileError = (field: ProfileField) => {
    setProfileErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  /** Campos obrigatórios do perfil: os mesmos do cadastro inicial. O telefone é opcional aqui. */
  const validateProfileDraft = (draft: ProfileState): Partial<Record<ProfileField, string>> => {
    const errors: Partial<Record<ProfileField, string>> = {};
    if (draft.name.trim().length < 2) errors.name = 'Preencha seu nome.';
    if (draft.username.trim().length < 3) errors.username = 'Preencha seu nome público.';
    if (!draft.birthCity || draft.birthCity.trim().length < 2) errors.birthCity = 'Preencha sua cidade natal.';
    if (!draft.age) errors.age = 'Preencha sua idade.';
    else if (draft.age < 18 || draft.age > 120) errors.age = 'Informe uma idade entre 18 e 120 anos.';
    if (!draft.gender) errors.gender = 'Selecione seu gênero.';
    if (!draft.timeAbroad) errors.timeAbroad = 'Selecione seu tempo no exterior.';
    const phoneDigits = draft.phone.replace(/\D/g, '');
    if (!phoneVerificationOn && phoneDigits.length > 0 && phoneDigits.length < 8) errors.phone = 'O telefone está muito curto.';
    return errors;
  };

  const saveCompleteProfile = async () => {
    if (!profileEditDraft) return;
    const validation = validateProfileDraft(profileEditDraft);
    setProfileErrors(validation);
    if (Object.values(validation).some(Boolean)) {
      showToast('Revise os campos destacados.', 'error');
      return;
    }
    const patchData = {
      name: profileEditDraft.name,
      username: profileEditDraft.username,
      phone: profileEditDraft.phone,
      bio: profileEditDraft.bio,
      coverImageUrl: profileEditDraft.coverImageUrl,
      galleryUrls: profileEditDraft.galleryUrls,
      interests: profileEditDraft.interests,
      gender: profileEditDraft.gender,
      age: profileEditDraft.age,
      timeAbroad: profileEditDraft.timeAbroad,
      birthCity: profileEditDraft.birthCity,
    };
    const imageChanged = profileEditDraft.image !== profile.image;
    const regionChanged = Boolean(profileEditDraft.regionKey) && profileEditDraft.regionKey !== profile.regionKey;
    const policyChanged = policyDraft !== null && policyDraft !== policySaved;
    const ok = await saveProfile(patchData, 'Perfil atualizado com sucesso.', 'profile');
    if (!ok) return;
    if (imageChanged && !(await saveAvatar(profileEditDraft.image, true))) return;
    if (regionChanged && !(await saveRegion(profileEditDraft.regionKey, true))) return;
    if (policyChanged) {
      try {
        const response = await fetch('/api/me/message-policy', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messagePolicy: policyDraft }),
        });
        if (!response.ok) throw new Error();
        setPolicySaved(policyDraft);
      } catch {
        showToast('Não foi possível salvar a privacidade de mensagens. Tente novamente.', 'error');
        return;
      }
    }
    clearStoredDraft();
    setDraftRestored(false);
    closeEditProfileModal();
  };

  const avatarImage = profile.image || DEFAULT_AVATAR_URL;
  const referralUrl = referralSummary.referralUrl || `${getClientAppBaseUrl()}/invites/${profile.username || 'seu-nome-publico'}`;
  const professionalIdentity = professionalProfile.identity;
  const isProfessionalView =
    canUseProfessionalMode && personaMode === 'professional' && Boolean(professionalIdentity);
  const activeHeaderName = profile.name;
  const activeHeaderHandle = `@${profile.username || 'defina-seu-nome'}`;
  const activeHeaderLocation = profile.locationLabel;
  const activeHeaderImage = avatarImage;
  const activeHeaderGradientClass = isProfessionalView
    ? PROFESSIONAL_PROFILE_GRADIENT_CLASS
    : PROFILE_GRADIENT_CLASS;
  const primaryButtonClass = isProfessionalView
    ? 'bg-navy'
    : 'bg-brand-500';
  const secondaryButtonClass = isProfessionalView
    ? 'border-border bg-bg text-foreground'
    : 'border-brand-100 bg-brand-100 text-brand-500';
  const sectionAccentClass = isProfessionalView ? 'text-foreground' : 'text-brand-500';

  if (loading) {
    return (
      <ContentColumn size="standard" className="animate-in space-y-5 pb-24 fade-in duration-500">
        <div className="h-72 animate-pulse rounded-[36px] bg-surface shadow-sm" />
        <div className="h-48 animate-pulse rounded-[32px] bg-surface shadow-sm" />
        <div className="h-48 animate-pulse rounded-[32px] bg-surface shadow-sm" />
      </ContentColumn>
    );
  }

  return (
    <ContentColumn size="standard" className="animate-in space-y-5 pb-24 fade-in duration-500">
      <section className="overflow-hidden rounded-[36px] bg-surface shadow-sm">
        <div className={`relative h-56 ${profile.coverImageUrl ? 'bg-slate-100' : activeHeaderGradientClass}`}>
          <ImageEditMenu folder="profiles" kind="cover" src={profile.coverImageUrl} className="bottom-3 right-3" onUploaded={async (url) => { await saveProfile({ coverImageUrl: url }, 'Capa atualizada.'); }} />
          {profile.coverImageUrl ? (
            <img src={profile.coverImageUrl} alt="Capa do perfil" className="h-full w-full object-cover object-center" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.28),_transparent_28%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-scrim/30 via-scrim/5 to-transparent" />
          <div className="absolute right-4 top-4 flex gap-2">
            <button type="button" onClick={openEditProfileModal} className="rounded-2xl border border-white/60 bg-surface/85 px-4 py-3 text-sm font-bold text-slate-600 inline-flex items-center gap-2" aria-label="Editar perfil completo">
              <PencilLine size={16} />
              Editar perfil
            </button>
          </div>
        </div>
        <div className="-mt-12 px-5 pb-5">
          <div className="flex flex-col items-center text-center">
            <div className="relative h-28 w-28">
            <div className="h-full w-full overflow-hidden rounded-full border-[5px] border-white bg-surface shadow-lg">
              {activeHeaderImage ? (
                <img src={activeHeaderImage} alt={activeHeaderName} className="h-full w-full object-cover" onError={handleAvatarError} />
              ) : (
                <div className={`flex h-full w-full items-center justify-center ${activeHeaderGradientClass} text-3xl font-bold text-white`}>
                  {getInitials(activeHeaderName)}
                </div>
              )}
            </div>
              <ImageEditMenu folder="profiles" kind="avatar" src={profile.image} className="bottom-1 right-0" onUploaded={async (url) => { await saveAvatar(url); }} />
            </div>
            <div className="relative mt-4">
              {canUseProfessionalMode ? (
                <PersonaModeDropdown
                  value={personaMode}
                  onChange={onPersonaModeChange}
                  personalSubtitle={`@${profile.username || 'defina-seu-nome'}`}
                  professionalSubtitle={professionalIdentity ? `@${professionalIdentity.slug}` : 'Cadastre um negócio'}
                  professionalDisabled={!professionalIdentity}
                />
              ) : null}
            </div>
            <h1 className="mt-4 text-h2 font-bold text-foreground">
              {activeHeaderName}
            </h1>
            <p className="mt-2 text-body-sm font-semibold text-muted-foreground">
              {activeHeaderHandle}
            </p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
              <MapPin size={14} />
              {activeHeaderLocation}
            </p>
          </div>

          <Modal open={editing.profile} onClose={closeEditProfileModal} title="Editar perfil" description="Atualize todos os seus dados pessoais em um único lugar." className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
            {profileEditDraft && (
              <EditorCard>
                <div className="space-y-4">
                  {draftRestored ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <span>Recuperamos as alterações que você não salvou.</span>
                      <button type="button" onClick={resetDraftToSaved} className="shrink-0 font-bold underline">Descartar</button>
                    </div>
                  ) : null}
                  <div>
                    <h3 className="mb-3 text-sm font-bold text-slate-600">Capa do perfil</h3>
                    <div className="space-y-3">
                      <CloudinaryImageField value={profileEditDraft.coverImageUrl} onChange={(coverImageUrl) => setProfileEditDraft((c) => c ? { ...c, coverImageUrl } : null)} folder="profiles" cropAspect={2} placeholder="Link da capa" hint="Use uma imagem horizontal para destacar seu perfil." />
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="mb-3 text-sm font-bold text-slate-600">Foto do perfil</h3>
                    <div className="space-y-3">
                      <CloudinaryImageField value={profileEditDraft.image} onChange={(image) => setProfileEditDraft((c) => c ? { ...c, image } : null)} folder="profiles" cropAspect={1} placeholder="Link da foto do perfil" hint="Envie uma foto quadrada, com o rosto bem visível." />
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="mb-3 text-sm font-bold text-slate-600">Informações pessoais</h3>
                    <div className="space-y-4">
                      <Field label="Nome completo" required error={profileErrors.name}>
                        <Input label="Nome completo" required error={profileErrors.name} value={profileEditDraft.name} onChange={(name) => { clearProfileError('name'); setProfileEditDraft((c) => c ? { ...c, name } : null); }} placeholder="Seu nome completo" icon={<UserRound size={16} />} />
                      </Field>
                      <Field label="Nome público" required error={profileErrors.username}>
                        <Input label="Nome público" required error={profileErrors.username} value={profileEditDraft.username} onChange={(username) => { clearProfileError('username'); setProfileEditDraft((c) => c ? { ...c, username: normalizeUsernameInput(username) } : null); }} placeholder="Como você aparece na comunidade" icon={<Globe size={16} />} />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Telefone" error={profileErrors.phone}>
                          {phoneVerificationOn ? (
                            <>
                              <div className={`${FIELD_BOX} ${fieldBorder()} justify-between`}>
                                <span className="flex min-w-0 items-center gap-2 text-sm text-text">
                                  <Phone size={16} className="shrink-0 text-slate-400" aria-hidden />
                                  <span className="truncate">{profileEditDraft.phone || 'Não informado'}</span>
                                </span>
                                {phoneVerified ? (
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700"><BadgeCheck size={13} aria-hidden /> Verificado</span>
                                ) : (
                                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">Não verificado</span>
                                )}
                              </div>
                              <button type="button" onClick={() => setChangingPhone(true)} className="mt-1.5 text-xs font-bold text-brand-600 hover:underline">Alterar número</button>
                            </>
                          ) : (
                            <Input label="Telefone" error={profileErrors.phone} value={profileEditDraft.phone} onChange={(phone) => { clearProfileError('phone'); setProfileEditDraft((c) => c ? { ...c, phone: formatLoosePhoneInput(phone) } : null); }} placeholder="+1 305 000 0000" icon={<Phone size={16} />} type="tel" inputMode="tel" />
                          )}
                        </Field>
                        <Field label="Cidade natal" required error={profileErrors.birthCity}>
                          <CityAutocomplete value={profileEditDraft.birthCity} scope="world" error={profileErrors.birthCity} onChange={(birthCity) => { clearProfileError('birthCity'); setProfileEditDraft((c) => c ? { ...c, birthCity } : null); }} placeholder="Onde você nasceu" />
                        </Field>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Idade" required error={profileErrors.age}>
                          <Input label="Idade" required error={profileErrors.age} value={profileEditDraft.age ? String(profileEditDraft.age) : ''} onChange={(value) => { clearProfileError('age'); const digits = value.replace(/\D/g, '').slice(0, 3); setProfileEditDraft((c) => c ? { ...c, age: digits ? Number(digits) : null } : null); }} placeholder="18 ou mais" icon={<CalendarDays size={16} />} type="text" inputMode="numeric" maxLength={3} />
                        </Field>
                        <Field label="Gênero" required error={profileErrors.gender}>
                          <select aria-label="Gênero" aria-required aria-invalid={Boolean(profileErrors.gender)} value={profileEditDraft.gender} onChange={(e) => { clearProfileError('gender'); setProfileEditDraft((c) => c ? { ...c, gender: e.target.value as ProfileState['gender'] } : null); }} className={`${SELECT_CLASS} ${fieldBorder(profileErrors.gender)}`}><option value="">Selecione</option><option value="FEMALE">Feminino</option><option value="MALE">Masculino</option><option value="OTHER">Outro</option><option value="PREFER_NOT_TO_SAY">Prefiro não informar</option></select>
                        </Field>
                      </div>
                      <Field label="Tempo no exterior" required error={profileErrors.timeAbroad}>
                        <select aria-label="Tempo no exterior" aria-required aria-invalid={Boolean(profileErrors.timeAbroad)} value={profileEditDraft.timeAbroad} onChange={(e) => { clearProfileError('timeAbroad'); setProfileEditDraft((c) => c ? { ...c, timeAbroad: e.target.value as ProfileState['timeAbroad'] } : null); }} className={`${SELECT_CLASS} ${fieldBorder(profileErrors.timeAbroad)}`}><option value="">Selecione</option><option value="LESS_THAN_ONE_YEAR">Menos de 1 ano</option><option value="ONE_TO_THREE_YEARS">De 1 a 3 anos</option><option value="THREE_TO_FIVE_YEARS">De 3 a 5 anos</option><option value="MORE_THAN_FIVE_YEARS">Mais de 5 anos</option></select>
                      </Field>
                      <Field label="Sobre você">
                        <textarea aria-label="Sobre você" rows={4} maxLength={220} value={profileEditDraft.bio} onChange={(e) => setProfileEditDraft((c) => c ? { ...c, bio: e.target.value } : null)} placeholder="Escreva uma frase curta sobre você" className="w-full rounded-3xl border-2 border-input bg-surface px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500" />
                      </Field>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="mb-3 text-sm font-bold text-slate-600">Interesses</h3>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input type="text" value={interestInput} onChange={(e) => setInterestInput(e.target.value)} placeholder="Adicionar interesse" className="flex-1 rounded-full border border-input bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-200" />
                        <button type="button" onClick={() => { const normalized = interestInput.trim(); if (normalized && !profileEditDraft.interests.includes(normalized) && profileEditDraft.interests.length < 8) { setProfileEditDraft((c) => c ? { ...c, interests: [...c.interests, normalized] } : null); setInterestInput(''); } }} className={`inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-bold text-white shadow-md ${primaryButtonClass}`}><Plus size={16} /></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profileEditDraft.interests.length > 0 ? profileEditDraft.interests.map((interest) => (
                          <span key={interest} className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                            {interest}
                            <button type="button" onClick={() => setProfileEditDraft((c) => c ? { ...c, interests: c.interests.filter((i) => i !== interest) } : null)} className="rounded-full bg-slate-100 p-1 text-slate-500"><X size={12} /></button>
                          </span>
                        )) : <p className="text-sm text-slate-500">Adicione até 8 interesses.</p>}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="mb-3 text-sm font-bold text-slate-600">Galeria</h3>
                    <ImageGalleryField value={profileEditDraft.galleryUrls} onChange={(galleryUrls) => setProfileEditDraft((c) => c ? { ...c, galleryUrls } : null)} folder="profiles" maxItems={6} hint="Adicione até 6 fotos pessoais, do trabalho ou da comunidade." />
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="mb-3 text-sm font-bold text-slate-600">Região ativa</h3>
                    <RegionSelector citySearch label="Cidade atual" value={profileEditDraft.regionKey} onChange={(region) => setProfileEditDraft((c) => c ? { ...c, regionKey: region.key } : null)} hint="Comunidade, negócios e eventos priorizam esta região." />
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="mb-1 text-sm font-bold text-slate-600">Aparência</h3>
                    <p className="mb-3 text-xs text-slate-500">Escolha o tema claro ou escuro. Em &ldquo;Sistema&rdquo;, o app segue a configuração do seu aparelho. Vale só para este aparelho.</p>
                    <ThemeSelector />
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="mb-1 text-sm font-bold text-slate-600">Idioma</h3>
                    <p className="mb-3 text-xs text-slate-500">Os idiomas disponíveis dependem das regiões ativas. Vale só para este aparelho.</p>
                    <LanguageSelector />
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="mb-3 text-sm font-bold text-slate-600">Privacidade: quem pode me enviar mensagens</h3>
                    <MessagePolicyOptions value={policyDraft} onChange={setPolicyDraft} disabled={savingKey === 'profile'} />
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="mb-1 text-sm font-bold text-slate-600">E-mail de acesso</h3>
                    <p className="mb-3 text-xs text-slate-500">Atual: {profile.email || 'não informado'}. Para trocar, enviamos um link de confirmação ao novo endereço.</p>
                    <div className="flex gap-2">
                      <div className="min-w-0 flex-1"><Input value={requestedEmail} onChange={setRequestedEmail} placeholder="Novo e-mail" icon={<Mail size={16} />} type="email" /></div>
                      <button type="button" onClick={() => void requestEmailChange()} disabled={requestingEmailChange || !requestedEmail.trim() || requestedEmail.trim() === profile.email} className="shrink-0 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                        {requestingEmailChange ? 'Enviando...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>

                  <ActionRow>
                    <PrimaryButton className={primaryButtonClass} label={savingKey === 'profile' ? 'Salvando...' : 'Salvar perfil'} onClick={() => void saveCompleteProfile()} disabled={savingKey === 'profile'} />
                    <SecondaryButton className={secondaryButtonClass} label="Cancelar" onClick={discardEditProfile} disabled={savingKey === 'profile'} />
                  </ActionRow>
                </div>
              </EditorCard>
            )}
          </Modal>
        </div>
      </section>

      <Modal open={changingPhone} onClose={() => setChangingPhone(false)} title="Alterar telefone" className="sm:max-w-md">
        <VerifyPhoneForm
          onVerified={(verifiedPhone) => {
            setProfile((current) => ({ ...current, phone: verifiedPhone }));
            setProfileEditDraft((current) => (current ? { ...current, phone: verifiedPhone } : current));
            void update();
            setChangingPhone(false);
            showToast('Telefone verificado e atualizado.', 'success');
          }}
        />
      </Modal>

      {isProfessionalView ? (
        <ProfessionalModePanel
          professionalProfile={professionalProfile}
          username={profile.username}
        />
      ) : (
        <>
      <Section accentClass={sectionAccentClass} secondaryButtonClass={secondaryButtonClass} title="Sobre você" description="Edite os dados que ajudam a comunidade a conhecer você." editing={false} onToggle={openEditProfileModal} hideAction>
          <div className="space-y-4">
            <p className="text-base leading-7 text-slate-700">{profile.bio || 'Adicione uma frase sobre você para personalizar seu perfil público.'}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Meta label="Email" value={profile.email || 'Não informado'} icon={<Mail size={16} />} />
              <Meta label="Telefone" value={profile.phone || 'Não informado'} icon={<Phone size={16} />} />
            </div>
            <Meta label="Região atual" value={profile.locationLabel} icon={<MapPin size={16} />} />
            <Meta label="URL pública" value={publicProfileUrl} icon={<Globe size={16} />} />
          </div>
      </Section>

      <Section accentClass={sectionAccentClass} secondaryButtonClass={secondaryButtonClass} title="Interesses" description="Mostre os assuntos, serviços e temas que representam você." editing={false} onToggle={openEditProfileModal} hideAction>
          <div className="flex flex-wrap gap-2">
            {profile.interests.length > 0 ? profile.interests.map((interest) => <span key={interest} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{interest}</span>) : <p className="text-sm text-slate-500">Ainda não há interesses cadastrados para este perfil.</p>}
          </div>
      </Section>

      <Section accentClass={sectionAccentClass} secondaryButtonClass={secondaryButtonClass} title="Galeria da galera" description="Use fotos pessoais, do seu trabalho ou da sua comunidade para enriquecer o perfil." editing={false} onToggle={openEditProfileModal} hideAction>
        {profile.galleryUrls.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profile.galleryUrls.map((imageUrl, index) => (
              <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50 shadow-sm">
                <img src={imageUrl} className="aspect-square w-full object-cover" alt={`${profile.name} - imagem ${index + 1}`} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyNotice title="Sem fotos na galeria" description="Use Editar perfil para adicionar fotos." />
        )}
      </Section>

      <Section accentClass={sectionAccentClass} secondaryButtonClass={secondaryButtonClass} title="Indicações" description="Compartilhe seu link público e acompanhe quantos cadastros chegaram por ele." editing={false} onToggle={() => undefined} hideAction>
        <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
          <p className={`text-lg font-bold ${sectionAccentClass}`}>{referralSummary.registrationCount} {referralSummary.registrationCount === 1 ? 'cadastro confirmado' : 'cadastros confirmados'}</p>
          <p className="mt-2 break-all text-sm text-slate-500">{withUtm('referral_invite', referralUrl)}</p>
          <button type="button" onClick={() => navigator.clipboard.writeText(withUtm('referral_invite', referralUrl)).then(() => showToast('Link de indicação copiado.', 'success')).catch(() => showToast(withUtm('referral_invite', referralUrl), 'info', 5000))} className={`mt-4 inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold ${secondaryButtonClass}`}>
            <Copy size={14} />
            Copiar
          </button>
        </div>
      </Section>

        </>
      )}
    </ContentColumn>
  );
};

const Section: React.FC<{ title: string; description: string; editing: boolean; onToggle: () => void; children: React.ReactNode; hideAction?: boolean; accentClass?: string; secondaryButtonClass?: string; }> = ({ title, description, editing, onToggle, children, hideAction = false, accentClass = 'text-brand-500', secondaryButtonClass = 'border-brand-100 bg-brand-100 text-brand-500' }) => (
  <section className="rounded-[32px] border border-slate-100 bg-surface p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className={`text-xl font-bold ${accentClass}`}>{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {!hideAction ? (
        <button type="button" onClick={onToggle} className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold ${secondaryButtonClass}`}>
          <PencilLine size={14} />
          Editar
        </button>
      ) : null}
    </div>
    {!editing ? <div className="mt-5">{children}</div> : null}
    {!hideAction ? (
      <Modal open={editing} onClose={onToggle} title={title} description={description} className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        {children}
      </Modal>
    ) : null}
  </section>
);

const EditorCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="space-y-4 rounded-[28px] bg-slate-50 p-4">{children}</div>
);

const ActionRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex gap-2">{children}</div>
);

// Campo do formulário de perfil: rótulo sempre visível, altura única (48px, igual ao CityAutocomplete)
// e mensagem de erro abaixo. Todos os campos do modal usam este mesmo molde para ficarem alinhados.
const FIELD_BOX = 'flex h-12 w-full items-center gap-2 rounded-full border-2 bg-surface px-4 transition-colors focus-within:border-brand-500';
const fieldBorder = (error?: string) => (error ? 'border-red-400' : 'border-input');

const Field: React.FC<{ label: string; required?: boolean; error?: string; children: React.ReactNode }> = ({ label, required, error, children }) => (
  <div className="min-w-0">
    <span className="mb-1.5 block text-xs font-bold text-slate-500">
      {label}
      {required ? <span className="ml-0.5 text-red-500" aria-hidden="true">*</span> : null}
    </span>
    {children}
    {error ? <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">{error}</p> : null}
  </div>
);

const Input: React.FC<{ value: string; onChange: (value: string) => void; placeholder: string; icon: React.ReactNode; type?: string; disabled?: boolean; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; maxLength?: number; error?: string; label?: string; required?: boolean; }> = ({ value, onChange, placeholder, icon, type = 'text', disabled = false, inputMode, maxLength, error, label, required }) => (
  <label className={`${FIELD_BOX} ${fieldBorder(error)} ${disabled ? 'bg-bg' : ''}`}>
    <span className="shrink-0 text-slate-400">{icon}</span>
    <input type={type} inputMode={inputMode} maxLength={maxLength} aria-label={label ?? placeholder} aria-required={required} aria-invalid={Boolean(error)} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} className="h-full min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-muted-foreground" />
  </label>
);

const SELECT_CLASS = 'h-12 w-full rounded-full border-2 bg-surface px-4 text-sm text-text outline-none transition-colors focus:border-brand-500';

const Meta: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
      {icon}
      {label}
    </div>
    <p className="mt-2 break-all text-sm font-semibold text-slate-700">{value}</p>
  </div>
);

const PrimaryButton: React.FC<{ label: string; onClick: () => void; disabled?: boolean; fullWidth?: boolean; className?: string }> = ({ label, onClick, disabled = false, fullWidth = false, className = 'bg-brand-500' }) => (
  <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-bold text-white shadow-md disabled:opacity-60 ${className} ${fullWidth ? 'w-full' : 'flex-1'}`}>
    {label}
  </button>
);

const SecondaryButton: React.FC<{ label: string; onClick: () => void; disabled?: boolean; className?: string }> = ({ label, onClick, disabled = false, className = 'border-brand-100 bg-brand-100 text-brand-500' }) => (
  <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border px-4 text-sm font-bold disabled:opacity-60 ${className}`}>
    {label}
  </button>
);

export default Profile;


