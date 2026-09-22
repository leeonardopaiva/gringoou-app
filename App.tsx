'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import Layout from './components/Layout';
import AppContent from './components/app/AppContent';
import AuthWorkspace from './components/app/AuthWorkspace';
import PublicEntry from './components/app/PublicEntry';
import { DEFAULT_AVATAR_URL } from './lib/avatar';
import { parseAppRoute } from './lib/app-route';
import { UserRole, type PersonaMode, type ProfessionalProfileBusiness, type ProfessionalProfileIdentity, type User } from './types';
import type { BusinessesInitialData, CommunityInitialData, EventsInitialData, HomeInitialData, ProfileInitialData } from './lib/content-contracts';

const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== 'false';
const EMAIL_AUTH_ENABLED = process.env.NEXT_PUBLIC_EMAIL_AUTH_ENABLED === 'true';
const PASSWORD_AUTH_ENABLED = true;
const DEV_AUTH_ENABLED =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === 'true';
const PERSONA_MODE_STORAGE_KEY = 'gringoou:persona-mode';
const BUSINESS_PROFILE_STORAGE_KEY = 'gringoou:business-profile-id';
const toProfessionalIdentity = (business: ProfessionalProfileBusiness): ProfessionalProfileIdentity => ({
  id: business.id,
  name: business.name,
  slug: business.slug,
  imageUrl: business.imageUrl,
  locationLabel: business.locationLabel,
  regionKey: business.regionKey,
  publicPath: business.publicPath,
});
const mapUserRole = (role?: string | null): UserRole => {
  switch (role) {
    case UserRole.ADMIN:
      return UserRole.ADMIN;
    case UserRole.MODERATOR:
      return UserRole.MODERATOR;
    case UserRole.BUSINESS_OWNER:
      return UserRole.BUSINESS_OWNER;
    case UserRole.COMPANY:
      return UserRole.COMPANY;
    default:
      return UserRole.USER;
  }
};

const buildCurrentUser = (sessionUser: {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  image?: string | null;
  phone?: string | null;
  locationLabel?: string | null;
  regionKey?: string | null;
  role?: string | null;
  recruiterVerified?: boolean;
}): User => ({
  id: sessionUser.id,
  name: sessionUser.name || 'Comunidade Gringoou',
  username: sessionUser.username,
  role: mapUserRole(sessionUser.role),
  avatar: sessionUser.image || DEFAULT_AVATAR_URL,
  location: sessionUser.locationLabel || 'Defina sua regiao',
  regionKey: sessionUser.regionKey,
  email: sessionUser.email,
  phone: sessionUser.phone,
  recruiterVerified: Boolean(sessionUser.recruiterVerified),
});

const App: React.FC<{
  initialHomeData?: HomeInitialData;
  initialCommunityData?: CommunityInitialData;
  initialBusinessesData?: BusinessesInitialData;
  initialEventsData?: EventsInitialData;
  initialProfileData?: ProfileInitialData;
}> = ({ initialHomeData, initialCommunityData, initialBusinessesData, initialEventsData, initialProfileData }) => {
  const pathname = usePathname() || '/';
  const { data: session, status, update } = useSession();
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [personaMode, setPersonaMode] = useState<PersonaMode>(() => {
    if (typeof window === 'undefined') {
      return 'personal';
    }

    return window.localStorage.getItem(PERSONA_MODE_STORAGE_KEY) === 'professional'
      ? 'professional'
      : 'personal';
  });
  const [personaModeReady, setPersonaModeReady] = useState(false);
  const [professionalIdentity, setProfessionalIdentity] = useState<ProfessionalProfileIdentity | null>(
    initialProfileData?.professionalProfile.identity ?? null,
  );
  const [professionalBusinesses, setProfessionalBusinesses] = useState<ProfessionalProfileBusiness[]>(
    initialProfileData?.professionalProfile.businesses ?? [],
  );
  const [professionalProfileLoaded, setProfessionalProfileLoaded] = useState(Boolean(initialProfileData));
  const {
    referralUsername,
    publicProfileUsername,
    professionalProfileUsername,
    groupSlug,
  } = parseAppRoute(pathname);
  const autoGoogleSelectTriggeredRef = useRef(false);
  const sessionRole = mapUserRole(session?.user?.role);
  const accountDeleted = Boolean(session?.user?.accountDeleted);
  const hasProfessionalBusinesses = professionalBusinesses.length > 0;
  const canUseProfessionalMode =
    sessionRole === UserRole.BUSINESS_OWNER ||
    sessionRole === UserRole.COMPANY ||
    sessionRole === UserRole.ADMIN ||
    hasProfessionalBusinesses;
  const authCallbackUrl = pathname === '/login' ? '/inicio' : pathname || '/inicio';

  useEffect(() => {
    if (accountDeleted) void signOut({ callbackUrl: '/login' });
  }, [accountDeleted]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!session?.user?.id) {
      setPersonaMode('personal');
      setPersonaModeReady(true);
      return;
    }

    if (!canUseProfessionalMode) {
      window.localStorage.removeItem(PERSONA_MODE_STORAGE_KEY);
      setPersonaMode('personal');
      setPersonaModeReady(true);
      return;
    }

    const storedMode = window.localStorage.getItem(PERSONA_MODE_STORAGE_KEY);
    setPersonaMode(storedMode === 'professional' ? 'professional' : 'personal');
    setPersonaModeReady(true);
  }, [canUseProfessionalMode, session?.user?.id]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !session?.user?.id ||
      !canUseProfessionalMode ||
      !personaModeReady
    ) {
      return;
    }

    window.localStorage.setItem(PERSONA_MODE_STORAGE_KEY, personaMode);
  }, [canUseProfessionalMode, personaMode, personaModeReady, session?.user?.id]);

  useEffect(() => {
    let ignore = false;

    const loadProfessionalIdentity = async () => {
      if (initialProfileData && session?.user?.id) {
        const businesses = initialProfileData.professionalProfile.businesses ?? [];
        const storedBusinessId = window.localStorage.getItem(BUSINESS_PROFILE_STORAGE_KEY);
        const selectedBusiness = businesses.find((business) => business.id === storedBusinessId) ?? businesses[0];
        setProfessionalBusinesses(businesses);
        setProfessionalIdentity(selectedBusiness ? toProfessionalIdentity(selectedBusiness) : null);
        if (businesses.length > 0) {
          setProfessionalProfileLoaded(true);
          return;
        }
      }

      setProfessionalProfileLoaded(false);

      if (!session?.user?.id) {
        setProfessionalBusinesses([]);
        setProfessionalIdentity(null);
        setProfessionalProfileLoaded(true);
        return;
      }

      try {
        const response = await fetch('/api/profile', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Nao foi possivel carregar o perfil profissional.');
        }

        if (!ignore) {
          const businesses = (payload?.professionalProfile?.businesses ?? []) as ProfessionalProfileBusiness[];
          const storedBusinessId = window.localStorage.getItem(BUSINESS_PROFILE_STORAGE_KEY);
          const selectedBusiness = businesses.find((business) => business.id === storedBusinessId) ?? businesses[0];
          setProfessionalBusinesses(businesses);
          setProfessionalIdentity(selectedBusiness ? toProfessionalIdentity(selectedBusiness) : null);
        }
      } catch (error) {
        console.error('Failed to load professional identity:', error);
      } finally {
        if (!ignore) {
          setProfessionalProfileLoaded(true);
        }
      }
    };

    void loadProfessionalIdentity();

    return () => {
      ignore = true;
    };
  }, [canUseProfessionalMode, initialProfileData, session?.user?.id, session?.user?.role]);

  useEffect(() => {
    if (
      professionalProfileLoaded &&
      personaMode === 'professional' &&
      !professionalIdentity
    ) {
      setPersonaMode('personal');
    }
  }, [personaMode, professionalIdentity, professionalProfileLoaded]);

  const handlePersonaModeChange = useCallback((mode: PersonaMode) => {
    setPersonaMode(mode);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PERSONA_MODE_STORAGE_KEY, mode);
      setPersonaModeReady(true);
    }
  }, []);

  const handleProfessionalBusinessChange = useCallback((businessId: string) => {
    const business = professionalBusinesses.find((item) => item.id === businessId);
    if (!business) return;

    setProfessionalIdentity(toProfessionalIdentity(business));
    setPersonaMode('professional');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(BUSINESS_PROFILE_STORAGE_KEY, business.id);
      window.localStorage.setItem(PERSONA_MODE_STORAGE_KEY, 'professional');
    }
  }, [professionalBusinesses]);

  const resolveDevMagicLink = async (email: string) => {
    if (!DEV_AUTH_ENABLED) {
      return false;
    }

    const response = await fetch(`/api/dev/magic-link?email=${encodeURIComponent(email)}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return false;
    }

    const payload = await response.json().catch(() => null);

    if (!payload?.url) {
      return false;
    }

    window.location.assign(payload.url);
    return true;
  };

  const handleGoogleLogin = async (selectAccount = false) => {
    setRegistrationError(null);
    setRegistrationNotice(null);

    try {
      // A tela de login representa troca de identidade, não vinculação de conta.
      // Remover uma sessão residual evita o OAuthAccountNotLinked quando o
      // navegador ainda carrega o JWT de outro usuário.
      await signOut({ redirect: false });

      await signIn(
        'google',
        { callbackUrl: authCallbackUrl },
        selectAccount ? { prompt: 'select_account' } : undefined,
      );
    } catch (error) {
      console.error('Google sign-in failed:', error);
      setRegistrationError('Nao foi possivel entrar com Google agora.');
    }
  };

  useEffect(() => {
    if (!session?.user && typeof window !== 'undefined') {
      const switchAccountRequested = new URLSearchParams(window.location.search).get('switchAccount') === '1';

      if (
        switchAccountRequested &&
        !publicProfileUsername &&
        !professionalProfileUsername &&
        !groupSlug &&
        !autoGoogleSelectTriggeredRef.current
      ) {
        autoGoogleSelectTriggeredRef.current = true;
        void handleGoogleLogin(true);
      }
    }

    if (
      session?.user ||
      publicProfileUsername ||
      professionalProfileUsername ||
      groupSlug
    ) {
      return;
    }
  }, [
    groupSlug,
    handleGoogleLogin,
    professionalProfileUsername,
    publicProfileUsername,
    session?.user,
  ]);

  const getMagicLinkErrorMessage = (error?: string | null) => {
    if (error === 'EmailSignin') {
      return 'Sua conta foi criada, mas não conseguimos enviar o e-mail de confirmação agora. Aguarde alguns minutos e tente entrar com e-mail novamente.';
    }

    return 'Não foi possível enviar o link de acesso. Tente novamente em alguns minutos.';
  };

  const requestMagicLink = async (email: string, isLocalTest = false, preserveNotice = false) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setRegistrationError('Informe um email para continuar.');
      return;
    }

    setRegistrationError(null);
    if (!preserveNotice) setRegistrationNotice(null);
    setAuthSubmitting(true);

    try {
      const result = await signIn('email', {
        email: normalizedEmail,
        redirect: false,
        callbackUrl: authCallbackUrl,
      });

      if (!result || result.error) {
        setRegistrationError(getMagicLinkErrorMessage(result?.error));
        return;
      }

      const redirected = await resolveDevMagicLink(normalizedEmail);

      if (redirected) {
        setRegistrationNotice('Abrindo o acesso local de teste...');
        return;
      }

      setRegistrationNotice(
        isLocalTest
          ? 'Magic link de teste gerado. Se o redirecionamento nao abrir, confira o terminal local.'
          : 'Enviamos o link de confirmação no seu email.',
      );
    } catch (error) {
      console.error('Email sign-in failed:', error);
      setRegistrationError(getMagicLinkErrorMessage());
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleEmailLogin = async (email: string) => {
    await requestMagicLink(email);
  };

  const performPasswordLogin = async (email: string, password: string) => {
    const result = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl: authCallbackUrl,
    });

    if (!result || result.error) {
      return {
        ok: false,
        error: result?.error || 'Nao foi possivel entrar com email e senha.',
      };
    }

    if (result.url) {
      window.location.assign(result.url);
    } else {
      window.location.assign(pathname === '/login' ? '/inicio' : pathname || '/inicio');
    }

    return { ok: true };
  };

  const handlePasswordLogin = async (values: { email: string; password: string }) => {
    setRegistrationError(null);
    setRegistrationNotice(null);
    setAuthSubmitting(true);

    try {
      const result = await performPasswordLogin(values.email, values.password);

      if (!result.ok) {
        setRegistrationError('Email ou senha invalidos.');
      }
    } catch (error) {
      console.error('Credentials sign-in failed:', error);
      setRegistrationError('Nao foi possivel entrar com email e senha.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handlePasswordRegister = async (values: {
    email: string;
    password: string;
    captchaToken: string;
    captchaAnswer: string;
  }) => {
    setRegistrationError(null);
    setRegistrationNotice(null);
    setAuthSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 409) {
          setRegistrationError('Já existe uma conta com este e-mail. Entre com a sua conta ou use "Esqueci minha senha" para definir uma nova senha.');
        } else if (response.status === 429) {
          setRegistrationError('Você fez muitas tentativas de cadastro. Aguarde alguns minutos antes de tentar novamente.');
        } else if (response.status === 503) {
          setRegistrationError('Os novos cadastros estão temporariamente indisponíveis. Tente novamente mais tarde.');
        } else {
          setRegistrationError(payload?.error ?? 'Não foi possível criar a conta.');
        }
        return;
      }

      setRegistrationNotice(payload?.message ?? 'Conta criada. Enviando confirmação...');
      await requestMagicLink(values.email, false, true);
    } catch (error) {
      console.error('Password registration failed:', error);
      setRegistrationError('Nao foi possivel criar a conta.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleProfileCompletion = async (values: {
    name: string;
    username: string;
    email: string;
    phone: string;
    regionKey: string;
    gender: string;
    age: string;
    timeAbroad: string;
    birthCity: string;
    referralUsername?: string | null;
  }) => {
    setRegistrationError(null);
    setRegistrationNotice(null);
    setSavingProfile(true);

    try {
      const onboardingPayload = {
        ...values,
        referralUsername: values.referralUsername ?? undefined,
      };

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(onboardingPayload),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setRegistrationError(payload?.error ?? 'Nao foi possivel salvar seu perfil.');
        return;
      }

      await update();
    } catch (error) {
      console.error('Profile completion failed:', error);
      setRegistrationError('Nao foi possivel salvar seu perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (status === 'loading') {
    return null;
  }

  if (accountDeleted) {
    return null;
  }

  const currentUser = session?.user ? buildCurrentUser(session.user) : null;

  if (pathname === '/login') {
    return (
      <AuthWorkspace
        referralUsername={referralUsername}
        mode={session?.user?.onboardingCompleted && session?.user?.username ? 'signin' : 'signin'}
        googleEnabled={GOOGLE_AUTH_ENABLED}
        emailEnabled={EMAIL_AUTH_ENABLED}
        passwordEnabled={PASSWORD_AUTH_ENABLED}
        onGoogleLogin={() => handleGoogleLogin(false)}
        onGoogleSelectAccount={() => handleGoogleLogin(true)}
        onEmailLogin={handleEmailLogin}
        onPasswordLogin={handlePasswordLogin}
        onPasswordRegister={handlePasswordRegister}
        submitting={authSubmitting}
        error={registrationError}
        notice={registrationNotice}
      />
    );
  }

  if (!session?.user) {
    if (publicProfileUsername || professionalProfileUsername || groupSlug) {
      return <PublicEntry pathname={pathname} />;
    }

    return null;
  }

  if (!session.user.onboardingCompleted || !session.user.username) {
    return (
      <AuthWorkspace
        referralUsername={referralUsername}
        mode="complete-profile"
        googleEnabled={GOOGLE_AUTH_ENABLED}
        emailEnabled={EMAIL_AUTH_ENABLED}
        passwordEnabled={PASSWORD_AUTH_ENABLED}
        onGoogleLogin={() => handleGoogleLogin(false)}
        onGoogleSelectAccount={() => handleGoogleLogin(true)}
        onCompleteProfile={handleProfileCompletion}
        submitting={savingProfile}
        error={registrationError}
        notice={registrationNotice}
        defaultValues={{
          name: session.user.name || '',
          username: session.user.username || '',
          email: session.user.email || '',
          phone: session.user.phone || '',
          regionKey: session.user.regionKey || '',
          gender: '',
          age: '',
          timeAbroad: '',
          birthCity: '',
        }}
      />
    );
  }

  const effectiveCanUseProfessionalMode =
    canUseProfessionalMode && (Boolean(professionalIdentity) || !professionalProfileLoaded);
  const effectivePersonaMode: PersonaMode =
    effectiveCanUseProfessionalMode && personaMode === 'professional' ? 'professional' : 'personal';

  if (publicProfileUsername || professionalProfileUsername || groupSlug) {
    return (
      <PublicEntry
        pathname={pathname}
        currentUser={currentUser!}
        personaMode={effectivePersonaMode}
        canUseProfessionalMode={canUseProfessionalMode}
        professionalIdentity={professionalIdentity}
        professionalBusinesses={professionalBusinesses}
        onProfessionalBusinessChange={handleProfessionalBusinessChange}
        onPersonaModeChange={handlePersonaModeChange}
        onSignOut={() => signOut({ callbackUrl: '/login?switchAccount=1' })}
      />
    );
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <AppContent
        currentUser={currentUser!}
        pathname={pathname}
        personaMode={personaMode}
        effectivePersonaMode={effectivePersonaMode}
        professionalIdentity={professionalIdentity}
        canUseProfessionalMode={canUseProfessionalMode}
        onPersonaModeChange={handlePersonaModeChange}
      />
    );
  }

  return (
    <Layout
      user={currentUser!}
      personaMode={effectivePersonaMode}
      canUseProfessionalMode={canUseProfessionalMode}
      professionalIdentity={professionalIdentity}
      professionalBusinesses={professionalBusinesses}
      onProfessionalBusinessChange={handleProfessionalBusinessChange}
      onPersonaModeChange={handlePersonaModeChange}
      onSignOut={() => signOut({ callbackUrl: '/login?switchAccount=1' })}
    >
      <AppContent
        currentUser={currentUser!}
        pathname={pathname}
        personaMode={personaMode}
        effectivePersonaMode={effectivePersonaMode}
        professionalIdentity={professionalIdentity}
        canUseProfessionalMode={canUseProfessionalMode}
        onPersonaModeChange={handlePersonaModeChange}
        initialHomeData={initialHomeData}
        initialCommunityData={initialCommunityData}
        initialBusinessesData={initialBusinessesData}
        initialEventsData={initialEventsData}
        initialProfileData={initialProfileData}
      />
    </Layout>
  );
};

export default App;



