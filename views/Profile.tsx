import React, { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Copy, Globe, Mail, MapPin, PencilLine, Phone, Plus, UserRound, X } from 'lucide-react';
import { useToast } from '../components/feedback/ToastProvider';
import CloudinaryImageField from '../components/forms/CloudinaryImageField';
import ImageGalleryField from '../components/forms/ImageGalleryField';
import RegionSelector from '../components/RegionSelector';
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

const PROFILE_GRADIENT_CLASS = 'bg-brand-500';
const PROFESSIONAL_PROFILE_GRADIENT_CLASS = 'bg-foreground';

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

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
};

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
});

const Profile: React.FC<{
  user: User;
  personaMode: PersonaMode;
  canUseProfessionalMode: boolean;
  onPersonaModeChange: (mode: PersonaMode) => void;
  initialData?: ProfileInitialData;
}> = ({ user, personaMode, canUseProfessionalMode, onPersonaModeChange, initialData }) => {
  const { update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const initialProfile = initialData?.user
    ? {
        id: initialData.user.id,
        name: initialData.user.name || user.name,
        username: initialData.user.username || '', email: initialData.user.email || '', phone: initialData.user.phone || '',
        image: initialData.user.image || '', coverImageUrl: initialData.user.coverImageUrl || '', bio: initialData.user.bio || '',
        interests: initialData.user.interests, galleryUrls: initialData.user.galleryUrls,
        locationLabel: initialData.user.locationLabel || user.location, regionKey: initialData.user.regionKey || '',
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
  const [accountDraft, setAccountDraft] = useState({
    name: user.name,
    username: user.username || '',
    email: user.email || '',
    phone: user.phone || '',
    bio: user.bio || '',
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
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!initialDataConsumedRef.current && initialData) {
      initialDataConsumedRef.current = true;
      setAvatarDraft(initialProfile.image);
      setCoverDraft(initialProfile.coverImageUrl);
      setAccountDraft({ name: initialProfile.name, username: initialProfile.username, email: initialProfile.email, phone: initialProfile.phone, bio: initialProfile.bio });
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
          throw new Error(payload?.error ?? 'Nao foi possivel carregar seu perfil.');
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
          showToast('Nao foi possivel carregar todos os dados do perfil.', 'error');
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
      showToast('Nao foi possivel validar esse link de troca de email.', 'error');
    }

    router.replace('/profile');
  }, [router, searchParams, showToast, update]);

  useEffect(() => {
    const editSection = searchParams?.get('edit');

    if (!editSection || loading) {
      return;
    }

    if (editSection === 'cover') {
      setEditing((current) => ({ ...current, cover: true }));
      setCoverDraft(profile.coverImageUrl);
    }

    router.replace('/profile', { scroll: false });
  }, [loading, profile.coverImageUrl, router, searchParams]);

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
    () => (profile.username ? `https://gringoou.com/${profile.username}` : 'https://gringoou.com/seu-perfil'),
    [profile.username],
  );

  const saveProfile = async (patch: Partial<ProfileState>, message: string, editKey?: keyof typeof editing) => {
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
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Nao foi possivel atualizar seu perfil.');
      const persistedProfile: Partial<ProfileState> = {
        name: payload?.user?.name || nextProfile.name,
        username: payload?.user?.username || normalizeUsernameInput(nextProfile.username),
        email: payload?.user?.email || nextProfile.email,
        phone: payload?.user?.phone || '',
        bio: payload?.user?.bio || '',
        coverImageUrl: payload?.user?.coverImageUrl || '',
        interests: Array.isArray(payload?.user?.interests) ? payload.user.interests : nextProfile.interests,
        galleryUrls: Array.isArray(payload?.user?.galleryUrls) ? payload.user.galleryUrls : nextProfile.galleryUrls,
      };

      setProfile((current) => ({ ...current, ...persistedProfile }));
      setAccountDraft({
        name: persistedProfile.name || nextProfile.name,
        username: persistedProfile.username || normalizeUsernameInput(nextProfile.username),
        email: persistedProfile.email || nextProfile.email,
        phone: persistedProfile.phone || '',
        bio: persistedProfile.bio || '',
      });
      setCoverDraft(persistedProfile.coverImageUrl || '');
      setInterestDrafts(persistedProfile.interests || []);
      setGalleryDraft(persistedProfile.galleryUrls || []);
      await update();
      if (editKey) setEditing((current) => ({ ...current, [editKey]: false }));
      showToast(message, 'success');
    } catch (error) {
      console.error('Failed to save profile:', error);
      showToast(error instanceof Error ? error.message : 'Nao foi possivel salvar o perfil.', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const saveAvatar = async () => {
    setSavingKey('avatar');
    try {
      const response = await fetch('/api/profile/image', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: normalizeUrlFieldValue(avatarDraft) || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Nao foi possivel atualizar sua foto.');
      const nextImage = payload?.user?.image || '';
      setProfile((current) => ({ ...current, image: nextImage }));
      setAvatarDraft(nextImage);
      await update();
      setEditing((current) => ({ ...current, avatar: false }));
      showToast('Foto do perfil atualizada.', 'success');
    } catch (error) {
      console.error('Failed to update avatar:', error);
      showToast(error instanceof Error ? error.message : 'Nao foi possivel atualizar sua foto.', 'error');
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
      if (!response.ok) throw new Error(payload?.error ?? 'Nao foi possivel iniciar a troca de email.');
      showToast('Enviamos um link de confirmacao para o novo email.', 'success');
    } catch (error) {
      console.error('Failed to request email change:', error);
      showToast(error instanceof Error ? error.message : 'Nao foi possivel iniciar a troca de email.', 'error');
    } finally {
      setRequestingEmailChange(false);
    }
  };

  const saveRegion = async () => {
    if (!selectedRegionKey) {
      showToast('Selecione uma regiao valida antes de salvar.', 'error');
      return;
    }
    setSavingKey('region');
    try {
      const response = await fetch('/api/profile/region', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionKey: selectedRegionKey }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Nao foi possivel atualizar sua regiao.');
      setProfile((current) => ({
        ...current,
        regionKey: payload?.user?.regionKey || selectedRegionKey,
        locationLabel: payload?.user?.locationLabel || current.locationLabel,
      }));
      await update();
      setEditing((current) => ({ ...current, region: false }));
      showToast('Regiao atualizada com sucesso.', 'success');
    } catch (error) {
      console.error('Failed to save region:', error);
      showToast(error instanceof Error ? error.message : 'Nao foi possivel atualizar sua regiao.', 'error');
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
      showToast('Voce pode usar no maximo 8 interesses.', 'error');
      return;
    }
    setInterestDrafts((current) => [...current, normalized]);
    setInterestInput('');
  };

  const avatarImage = profile.image || DEFAULT_AVATAR_URL;
  const referralUrl = referralSummary.referralUrl || (profile.username ? `https://gringoou.com/convite/${profile.username}` : 'https://gringoou.com/convite/seu-nome-publico');
  const professionalIdentity = professionalProfile.identity;
  const isProfessionalView =
    canUseProfessionalMode && personaMode === 'professional' && Boolean(professionalIdentity);
  const activeHeaderName = isProfessionalView && professionalIdentity ? professionalIdentity.name : profile.name;
  const activeHeaderHandle = isProfessionalView && professionalIdentity
    ? `@${professionalIdentity.slug}`
    : `@${profile.username || 'defina-seu-nome'}`;
  const activeHeaderLocation =
    isProfessionalView && professionalIdentity?.locationLabel
      ? professionalIdentity.locationLabel
      : profile.locationLabel;
  const activeHeaderImage =
    isProfessionalView && professionalIdentity?.imageUrl ? professionalIdentity.imageUrl : avatarImage;
  const activeHeaderGradientClass = isProfessionalView
    ? PROFESSIONAL_PROFILE_GRADIENT_CLASS
    : PROFILE_GRADIENT_CLASS;
  const primaryButtonClass = isProfessionalView
    ? 'bg-foreground'
    : 'bg-brand-500';
  const secondaryButtonClass = isProfessionalView
    ? 'border-border bg-bg text-foreground'
    : 'border-brand-100 bg-brand-100 text-brand-500';
  const sectionAccentClass = isProfessionalView ? 'text-foreground' : 'text-brand-500';

  if (loading) {
    return (
      <ContentColumn className="animate-in space-y-5 px-5 pb-24 pt-6 fade-in duration-500">
        <div className="h-72 animate-pulse rounded-[36px] bg-white shadow-sm" />
        <div className="h-48 animate-pulse rounded-[32px] bg-white shadow-sm" />
        <div className="h-48 animate-pulse rounded-[32px] bg-white shadow-sm" />
      </ContentColumn>
    );
  }

  return (
    <ContentColumn className="animate-in space-y-5 px-5 pb-24 pt-6 fade-in duration-500">
      <section className="overflow-hidden rounded-[36px] bg-white shadow-sm">
        <div className={`relative h-56 ${
          !isProfessionalView && profile.coverImageUrl ? 'bg-slate-100' : activeHeaderGradientClass
        }`}>
          {!isProfessionalView && profile.coverImageUrl ? (
            <img src={profile.coverImageUrl} alt="Capa do perfil" className="h-full w-full object-cover object-center" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.28),_transparent_28%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-slate-950/5 to-transparent" />
          {!isProfessionalView ? (
            <button type="button" onClick={() => { setEditing((c) => ({ ...c, cover: !c.cover })); setCoverDraft(profile.coverImageUrl); }} className="absolute right-4 top-4 rounded-2xl border border-white/60 bg-white/85 p-3 text-slate-600">
              <PencilLine size={16} />
            </button>
          ) : null}
        </div>
        <div className="-mt-12 px-5 pb-5">
          <div className="flex flex-col items-center text-center">
            <div className="relative h-28 w-28 overflow-hidden rounded-full border-[5px] border-white bg-white shadow-lg">
              {activeHeaderImage ? (
                <img src={activeHeaderImage} alt={activeHeaderName} className="h-full w-full object-cover" onError={handleAvatarError} />
              ) : (
                <div className={`flex h-full w-full items-center justify-center ${activeHeaderGradientClass} text-3xl font-bold text-white`}>
                  {getInitials(activeHeaderName)}
                </div>
              )}
              {!isProfessionalView ? (
                <button type="button" onClick={() => { setEditing((c) => ({ ...c, avatar: !c.avatar })); setAvatarDraft(profile.image); }} className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-white p-2 text-brand-500">
                  <PencilLine size={14} />
                </button>
              ) : null}
            </div>
            <div className="relative mt-4">
              {canUseProfessionalMode ? (
                <PersonaModeDropdown
                  value={personaMode}
                  onChange={onPersonaModeChange}
                  personalSubtitle={`@${profile.username || 'defina-seu-nome'}`}
                  professionalSubtitle={professionalIdentity ? `@${professionalIdentity.slug}` : 'Cadastre um negocio'}
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

          <Modal open={!isProfessionalView && editing.cover} onClose={() => setEditing((c) => ({ ...c, cover: false }))} title="Editar capa" description="Selecione uma imagem horizontal para o seu perfil.">
            <EditorCard>
              <CloudinaryImageField value={coverDraft} onChange={setCoverDraft} folder="profiles" placeholder="Link da capa do perfil" hint="Use uma imagem horizontal para destacar seu perfil publico." />
              <ActionRow>
                <PrimaryButton className={primaryButtonClass} label={savingKey === 'cover' ? 'Salvando...' : 'Salvar capa'} onClick={() => void saveProfile({ coverImageUrl: coverDraft }, 'Capa atualizada com sucesso.', 'cover')} disabled={savingKey === 'cover'} />
                <SecondaryButton className={secondaryButtonClass} label={coverDraft ? 'Limpar' : 'Cancelar'} onClick={() => { if (coverDraft) { setCoverDraft(''); return; } setEditing((c) => ({ ...c, cover: false })); }} disabled={savingKey === 'cover'} />
              </ActionRow>
            </EditorCard>
          </Modal>

          <Modal open={!isProfessionalView && editing.avatar} onClose={() => setEditing((c) => ({ ...c, avatar: false }))} title="Editar foto" description="Selecione uma nova foto para o seu perfil.">
            <EditorCard>
              <CloudinaryImageField value={avatarDraft} onChange={setAvatarDraft} folder="profiles" placeholder="Link da foto do perfil" hint="Envie sua foto pela Cloudinary ou cole uma URL publica." />
              <ActionRow>
                <PrimaryButton className={primaryButtonClass} label={savingKey === 'avatar' ? 'Salvando...' : 'Salvar foto'} onClick={() => void saveAvatar()} disabled={savingKey === 'avatar'} />
                <SecondaryButton className={secondaryButtonClass} label={avatarDraft ? 'Limpar' : 'Cancelar'} onClick={() => { if (avatarDraft) { setAvatarDraft(''); return; } setEditing((c) => ({ ...c, avatar: false })); }} disabled={savingKey === 'avatar'} />
              </ActionRow>
            </EditorCard>
          </Modal>
        </div>
      </section>

      {isProfessionalView ? (
        <ProfessionalModePanel
          professionalProfile={professionalProfile}
          username={profile.username}
        />
      ) : (
        <>
      <Section accentClass={sectionAccentClass} secondaryButtonClass={secondaryButtonClass} title="Sobre voce" description="Edite nome, apresentacao e telefone que aparecem no seu perfil." editing={editing.account} onToggle={() => { setEditing((c) => ({ ...c, account: !c.account })); setAccountDraft({ name: profile.name, username: profile.username, email: profile.email, phone: profile.phone, bio: profile.bio }); }}>
        {editing.account ? (
          <EditorCard>
            <Input value={accountDraft.name} onChange={(value) => setAccountDraft((c) => ({ ...c, name: value }))} placeholder="Nome completo" icon={<UserRound size={16} />} />
            <Input value={accountDraft.username} onChange={(value) => setAccountDraft((c) => ({ ...c, username: normalizeUsernameInput(value) }))} placeholder="Nome publico" icon={<Globe size={16} />} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={accountDraft.email} onChange={(value) => setAccountDraft((c) => ({ ...c, email: value }))} placeholder="Email" icon={<Mail size={16} />} type="email" disabled />
              <Input value={accountDraft.phone} onChange={(value) => setAccountDraft((c) => ({ ...c, phone: formatLoosePhoneInput(value) }))} placeholder="Telefone" icon={<Phone size={16} />} type="tel" />
            </div>
            <textarea rows={4} value={accountDraft.bio} onChange={(event) => setAccountDraft((c) => ({ ...c, bio: event.target.value }))} placeholder="Escreva uma frase curta sobre voce" className="w-full rounded-md border border-input bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-200" />
            <ActionRow>
              <PrimaryButton className={primaryButtonClass} label={savingKey === 'account' ? 'Salvando...' : 'Salvar dados'} onClick={() => void saveProfile({ name: accountDraft.name, username: accountDraft.username, phone: accountDraft.phone, bio: accountDraft.bio }, 'Seus dados foram atualizados.', 'account')} disabled={savingKey === 'account'} />
              <SecondaryButton className={secondaryButtonClass} label="Cancelar" onClick={() => setEditing((c) => ({ ...c, account: false }))} disabled={savingKey === 'account'} />
            </ActionRow>
          </EditorCard>
        ) : (
          <div className="space-y-4">
            <p className="text-base leading-7 text-slate-700">{profile.bio || 'Adicione uma frase sobre voce para personalizar seu perfil publico.'}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Meta label="Email" value={profile.email || 'Nao informado'} icon={<Mail size={16} />} />
              <Meta label="Telefone" value={profile.phone || 'Nao informado'} icon={<Phone size={16} />} />
            </div>
            <Meta label="URL publica" value={publicProfileUrl} icon={<Globe size={16} />} />
          </div>
        )}
      </Section>

      <Section accentClass={sectionAccentClass} secondaryButtonClass={secondaryButtonClass} title="Interesses" description="Mostre os assuntos, servicos e temas que representam voce." editing={editing.interests} onToggle={() => { setEditing((c) => ({ ...c, interests: !c.interests })); setInterestDrafts(profile.interests); setInterestInput(''); }}>
        {editing.interests ? (
          <EditorCard>
            <div className="flex gap-2">
              <input type="text" value={interestInput} onChange={(event) => setInterestInput(event.target.value)} placeholder="Adicionar interesse" className="flex-1 rounded-full border border-input bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-200" />
              <button type="button" onClick={addInterest} className={`inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-bold text-white shadow-md ${primaryButtonClass}`}>
                <Plus size={16} />
                Adicionar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {interestDrafts.length > 0 ? interestDrafts.map((interest) => (
                <span key={interest} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  {interest}
                  <button type="button" onClick={() => setInterestDrafts((current) => current.filter((item) => item !== interest))} className="rounded-full bg-slate-100 p-1 text-slate-500">
                    <X size={12} />
                  </button>
                </span>
              )) : <p className="text-sm text-slate-500">Adicione ate 8 interesses para destacar seu perfil.</p>}
            </div>
            <ActionRow>
              <PrimaryButton className={primaryButtonClass} label={savingKey === 'interests' ? 'Salvando...' : 'Salvar interesses'} onClick={() => void saveProfile({ interests: interestDrafts }, 'Interesses atualizados.', 'interests')} disabled={savingKey === 'interests'} />
              <SecondaryButton className={secondaryButtonClass} label="Cancelar" onClick={() => setEditing((c) => ({ ...c, interests: false }))} disabled={savingKey === 'interests'} />
            </ActionRow>
          </EditorCard>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile.interests.length > 0 ? profile.interests.map((interest) => <span key={interest} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{interest}</span>) : <p className="text-sm text-slate-500">Ainda nao ha interesses cadastrados para este perfil.</p>}
          </div>
        )}
      </Section>

      <Section accentClass={sectionAccentClass} secondaryButtonClass={secondaryButtonClass} title="Galeria da galera" description="Use fotos pessoais, do seu trabalho ou da sua comunidade para enriquecer o perfil." editing={editing.gallery} onToggle={() => { setEditing((c) => ({ ...c, gallery: !c.gallery })); setGalleryDraft(profile.galleryUrls); }}>
        {editing.gallery ? (
          <EditorCard>
            <ImageGalleryField value={galleryDraft} onChange={setGalleryDraft} folder="profiles" hint="Essas imagens aparecem na aba de fotos do seu perfil publico." />
            <ActionRow>
              <PrimaryButton className={primaryButtonClass} label={savingKey === 'gallery' ? 'Salvando...' : 'Salvar galeria'} onClick={() => void saveProfile({ galleryUrls: galleryDraft }, 'Galeria atualizada.', 'gallery')} disabled={savingKey === 'gallery'} />
              <SecondaryButton className={secondaryButtonClass} label="Cancelar" onClick={() => setEditing((c) => ({ ...c, gallery: false }))} disabled={savingKey === 'gallery'} />
            </ActionRow>
          </EditorCard>
        ) : profile.galleryUrls.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profile.galleryUrls.map((imageUrl, index) => (
              <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50 shadow-sm">
                <img src={imageUrl} className="aspect-square w-full object-cover" alt={`${profile.name} - imagem ${index + 1}`} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nenhuma imagem adicional cadastrada ainda.</p>
        )}
      </Section>

      <Section accentClass={sectionAccentClass} secondaryButtonClass={secondaryButtonClass} title="Troca de email" description="Informe o novo email. Vamos enviar um link para confirmar a alteracao com seguranca." editing={false} onToggle={() => undefined} hideAction>
        <EditorCard>
          <Input value={requestedEmail} onChange={setRequestedEmail} placeholder="Novo email" icon={<Mail size={16} />} type="email" />
          <p className="text-xs font-medium text-slate-500">O email atual so muda depois que voce abrir o link enviado para o novo endereco.</p>
          <PrimaryButton className={primaryButtonClass} label={requestingEmailChange ? 'Enviando link...' : 'Enviar confirmacao'} onClick={() => void requestEmailChange()} disabled={requestingEmailChange} fullWidth />
        </EditorCard>
      </Section>

      <Section accentClass={sectionAccentClass} secondaryButtonClass={secondaryButtonClass} title="Indicacoes" description="Compartilhe seu link publico e acompanhe quantos cadastros chegaram por ele." editing={false} onToggle={() => undefined} hideAction>
        <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
          <p className={`text-lg font-bold ${sectionAccentClass}`}>{referralSummary.registrationCount} {referralSummary.registrationCount === 1 ? 'cadastro confirmado' : 'cadastros confirmados'}</p>
          <p className="mt-2 break-all text-sm text-slate-500">{referralUrl}</p>
          <button type="button" onClick={() => navigator.clipboard.writeText(referralUrl).then(() => showToast('Link de indicacao copiado.', 'success')).catch(() => showToast(referralUrl, 'info', 5000))} className={`mt-4 inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold ${secondaryButtonClass}`}>
            <Copy size={14} />
            Copiar
          </button>
        </div>
      </Section>

      <Section accentClass={sectionAccentClass} secondaryButtonClass={secondaryButtonClass} title="Regiao ativa" description="Comunidade, negocios e eventos priorizam esta regiao." editing={editing.region} onToggle={() => setEditing((c) => ({ ...c, region: !c.region }))}>
        {editing.region ? (
          <EditorCard>
            <RegionSelector value={selectedRegionKey} onChange={(region) => setSelectedRegionKey(region.key)} hint="Voce pode manter sua localizacao atual ou trocar manualmente para outra regiao existente." />
            <ActionRow>
              <PrimaryButton className={primaryButtonClass} label={savingKey === 'region' ? 'Salvando...' : 'Salvar regiao'} onClick={() => void saveRegion()} disabled={savingKey === 'region'} />
              <SecondaryButton className={secondaryButtonClass} label="Cancelar" onClick={() => setEditing((c) => ({ ...c, region: false }))} disabled={savingKey === 'region'} />
            </ActionRow>
          </EditorCard>
        ) : (
          <Meta label="Regiao atual" value={profile.locationLabel} icon={<MapPin size={16} />} />
        )}
      </Section>
        </>
      )}
    </ContentColumn>
  );
};

const Section: React.FC<{ title: string; description: string; editing: boolean; onToggle: () => void; children: React.ReactNode; hideAction?: boolean; accentClass?: string; secondaryButtonClass?: string; }> = ({ title, description, editing, onToggle, children, hideAction = false, accentClass = 'text-brand-500', secondaryButtonClass = 'border-brand-100 bg-brand-100 text-brand-500' }) => (
  <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
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
      <Modal open={editing} onClose={onToggle} title={title} description={description} className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
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

const Input: React.FC<{ value: string; onChange: (value: string) => void; placeholder: string; icon: React.ReactNode; type?: string; disabled?: boolean; }> = ({ value, onChange, placeholder, icon, type = 'text', disabled = false }) => (
  <label className="relative block">
    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} className="w-full rounded-full border border-input bg-surface px-11 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-bg disabled:text-muted-foreground" />
  </label>
);

const Meta: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
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


