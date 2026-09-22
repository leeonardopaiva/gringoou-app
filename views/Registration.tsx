import React, { useEffect, useState } from 'react';
import { ArrowLeft, Globe, MailCheck, RefreshCcw, Shield } from 'lucide-react';
import { Button, Card, Input } from '@heroui/react';
import FieldErrorMessage from '../components/forms/FieldErrorMessage';
import RegionSelector from '../components/RegionSelector';
import { Logo } from '../components/Layout';
import GoogleIcon from '../components/icons/GoogleIcon';
import { GringoouLogo } from '../components/icons/GringoouLogo';
import { Autocomplete } from '../components/ui/Autocomplete';
import { ProgressBar } from '../components/ui/ProgressBar';
import {
  COUNTRY_CALLING_CODE_OPTIONS,
  findCountryByIso2,
  splitPhoneNumber,
} from '../lib/country-calling-codes';
import { buildInternationalPhone, formatPhoneInputByCountry } from '../lib/forms/phone';
import {
  type FieldErrors,
  hasFieldErrors,
  isValidEmail,
  requiredFieldError,
  validatePhoneField,
} from '../lib/forms/validation';
import { getPasswordValidationIssues } from '../lib/forms/password';
import { USERNAME_MIN_LENGTH, normalizeUsernameInput, validateUsernameValue } from '../lib/username';

type RegistrationMode = 'signin' | 'complete-profile';

type RegistrationValues = {
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
};

interface RegistrationProps {
  mode: RegistrationMode;
  googleEnabled: boolean;
  emailEnabled: boolean;
  passwordEnabled: boolean;
  onGoogleLogin: () => void;
  onGoogleSelectAccount?: () => void;
  onEmailLogin?: (email: string) => Promise<void>;
  onPasswordLogin?: (values: { email: string; password: string }) => Promise<void>;
  onPasswordRegister?: (values: {
    email: string;
    password: string;
    captchaToken: string;
    captchaAnswer: string;
  }) => Promise<void>;
  onCompleteProfile?: (values: RegistrationValues) => Promise<void>;
  submitting?: boolean;
  error?: string | null;
  notice?: string | null;
  referralUsername?: string | null;
  defaultValues?: RegistrationValues;
}

type RegistrationField =
  | 'email'
  | 'name'
  | 'username'
  | 'phone'
  | 'regionKey'
  | 'gender'
  | 'age'
  | 'timeAbroad'
  | 'birthCity'
  | 'password'
  | 'confirmPassword'
  | 'captchaAnswer';

type PasswordAuthView = 'none' | 'signin' | 'signup' | 'forgot' | 'reset';

const fieldLabel = 'text-xs font-semibold uppercase tracking-[0.22em] text-slate-500';
const inputClass =
  'h-14 min-h-14 w-full min-w-0 rounded-full border border-input bg-surface px-5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200';
const secondaryCardClass = 'border border-slate-200 bg-slate-50 shadow-none';
const birthCityOptions = [
  'Sao Paulo, SP', 'Rio de Janeiro, RJ', 'Belo Horizonte, MG', 'Salvador, BA',
  'Brasilia, DF', 'Fortaleza, CE', 'Recife, PE', 'Porto Alegre, RS',
  'Curitiba, PR', 'Manaus, AM', 'Belem, PA', 'Goiania, GO', 'Campinas, SP',
  'Florianopolis, SC', 'Vitoria, ES', 'Natal, RN', 'Joao Pessoa, PB',
];

const Registration: React.FC<RegistrationProps> = ({
  mode,
  googleEnabled,
  emailEnabled,
  passwordEnabled,
  onGoogleLogin,
  onGoogleSelectAccount,
  onEmailLogin,
  onPasswordLogin,
  onPasswordRegister,
  onCompleteProfile,
  submitting = false,
  error,
  notice,
  referralUsername,
  defaultValues,
}) => {
  const initialPhoneState = splitPhoneNumber(defaultValues?.phone);
  const [formValues, setFormValues] = useState<RegistrationValues>({
    name: defaultValues?.name || '',
    username: defaultValues?.username || '',
    email: defaultValues?.email || '',
    phone: initialPhoneState.localNumber,
    regionKey: defaultValues?.regionKey || '',
    gender: defaultValues?.gender || '',
    age: defaultValues?.age || '',
    timeAbroad: defaultValues?.timeAbroad || '',
    birthCity: defaultValues?.birthCity || '',
  });
  const [selectedCountryIso2, setSelectedCountryIso2] = useState(initialPhoneState.country.iso2);
  const [usernameFeedback, setUsernameFeedback] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<RegistrationField>>({});
  const [passwordAuthView, setPasswordAuthView] = useState<PasswordAuthView>('none');
  const [passwordSignIn, setPasswordSignIn] = useState({ email: '', password: '' });
  const [passwordSignUp, setPasswordSignUp] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    captchaAnswer: '',
  });
  const [passwordReset, setPasswordReset] = useState({ email: '', password: '', confirmPassword: '', token: '' });
  const [passwordResetMessage, setPasswordResetMessage] = useState<string | null>(null);
  const [passwordResetHasError, setPasswordResetHasError] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [captchaPrompt, setCaptchaPrompt] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);

  const isOnboarding = mode === 'complete-profile';
  const normalizedUsername = normalizeUsernameInput(formValues.username);
  const selectedCountry = findCountryByIso2(selectedCountryIso2);
  const passwordIssues = getPasswordValidationIssues(passwordSignUp.password);
  const showGoogleOnlyAuth = googleEnabled && !emailEnabled && !passwordEnabled;
  const isPasswordRecoveryView = passwordAuthView === 'forgot' || passwordAuthView === 'reset';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken');
    const email = params.get('email') || '';
    if (token) {
      setPasswordReset((current) => ({ ...current, token, email }));
      setPasswordAuthView('reset');
    }
  }, []);

  useEffect(() => {
    const nextPhoneState = splitPhoneNumber(defaultValues?.phone);

    setSelectedCountryIso2(nextPhoneState.country.iso2);
    setFormValues({
      name: defaultValues?.name || '',
      username: defaultValues?.username || '',
      email: defaultValues?.email || '',
      phone: nextPhoneState.localNumber,
      regionKey: defaultValues?.regionKey || '',
      gender: defaultValues?.gender || '',
      age: defaultValues?.age || '',
      timeAbroad: defaultValues?.timeAbroad || '',
      birthCity: defaultValues?.birthCity || '',
    });
  }, [
    defaultValues?.email,
    defaultValues?.name,
    defaultValues?.phone,
    defaultValues?.regionKey,
    defaultValues?.username,
    defaultValues?.gender,
    defaultValues?.age,
    defaultValues?.timeAbroad,
    defaultValues?.birthCity,
  ]);

  useEffect(() => {
    if (!isOnboarding) {
      return;
    }

    if (!formValues.username) {
      setUsernameFeedback(null);
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }

    const validation = validateUsernameValue(formValues.username);

    if (validation.error) {
      setUsernameFeedback(validation.error);
      setUsernameAvailable(false);
      setCheckingUsername(false);
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    setUsernameAvailable(null);
    setUsernameFeedback(`Validando disponibilidade de @${validation.normalized}...`);
    setCheckingUsername(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/usernames/check?username=${encodeURIComponent(validation.normalized)}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );
        const payload = await response.json().catch(() => null);

        if (ignore) {
          return;
        }

        setUsernameAvailable(Boolean(payload?.available));
        setUsernameFeedback(
          payload?.available
            ? `Nome público disponível: @${payload.username}`
            : payload?.reason ?? 'Não foi possível validar o nome público.',
        );
      } catch (usernameError) {
        if (!ignore) {
          console.error('Failed to validate username:', usernameError);
          setUsernameAvailable(false);
          setUsernameFeedback('Não foi possível validar o nome público agora.');
        }
      } finally {
        if (!ignore) {
          setCheckingUsername(false);
        }
      }
    }, 350);

    return () => {
      ignore = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [formValues.username, isOnboarding]);

  const onboardingBlocked =
    isOnboarding &&
    (!formValues.regionKey ||
      !formValues.gender ||
      !formValues.age ||
      !formValues.timeAbroad ||
      !formValues.birthCity.trim() ||
      checkingUsername ||
      usernameAvailable !== true ||
      normalizedUsername.length < USERNAME_MIN_LENGTH);
  const onboardingRequiredValues = [
    formValues.name,
    formValues.username,
    formValues.regionKey,
    formValues.gender,
    formValues.age,
    formValues.timeAbroad,
    formValues.birthCity,
  ];
  const onboardingProgress = Math.round(
    (onboardingRequiredValues.filter((value) => value.trim()).length / onboardingRequiredValues.length) * 100,
  );

  const clearFieldError = (field: RegistrationField) => {
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

  const loadCaptcha = async () => {
    if (!passwordEnabled) {
      return;
    }

    setLoadingCaptcha(true);

    try {
      const response = await fetch('/api/auth/captcha', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.prompt || !payload?.token) {
        throw new Error('Não foi possível carregar o captcha.');
      }

      setCaptchaPrompt(payload.prompt);
      setCaptchaToken(payload.token);
    } catch (captchaError) {
      console.error('Failed to load captcha:', captchaError);
      setCaptchaPrompt('');
      setCaptchaToken('');
    } finally {
      setLoadingCaptcha(false);
    }
  };

  useEffect(() => {
    if (!isOnboarding && passwordEnabled && passwordAuthView === 'signup' && !captchaToken) {
      void loadCaptcha();
    }
  }, [captchaToken, isOnboarding, passwordAuthView, passwordEnabled]);

  const openPasswordView = (view: Exclude<PasswordAuthView, 'none'>) => {
    setPasswordAuthView(view);
    setFieldErrors((current) => ({
      ...current,
      email: undefined,
      password: undefined,
      confirmPassword: undefined,
      captchaAnswer: undefined,
    }));

    if (view === 'signup') {
      void loadCaptcha();
    }
  };

  const submitGoogleLogin = () => {
    setGoogleSubmitting(true);
    onGoogleLogin();
  };

  const submitGoogleSelectAccount = () => {
    setGoogleSubmitting(true);
    if (onGoogleSelectAccount) {
      onGoogleSelectAccount();
      return;
    }

    onGoogleLogin();
  };

  const requestPasswordReset = async () => {
    if (!isValidEmail(passwordReset.email)) { setFieldErrors((current) => ({ ...current, email: 'Informe um email válido.' })); return; }
    setPasswordResetLoading(true); setPasswordResetMessage(null); setPasswordResetHasError(false);
    try {
      const response = await fetch('/api/auth/password-reset/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: passwordReset.email }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível solicitar a redefinição.');
      setPasswordResetMessage(payload.message);
    } catch (resetError) { setPasswordResetHasError(true); setPasswordResetMessage(resetError instanceof Error ? resetError.message : 'Não foi possível solicitar a redefinição.'); }
    finally { setPasswordResetLoading(false); }
  };

  const confirmPasswordReset = async () => {
    const issues = getPasswordValidationIssues(passwordReset.password);
    if (issues.length) { setFieldErrors((current) => ({ ...current, password: issues[0] })); return; }
    if (passwordReset.password !== passwordReset.confirmPassword) { setFieldErrors((current) => ({ ...current, confirmPassword: 'As senhas precisam ser iguais.' })); return; }
    setPasswordResetLoading(true); setPasswordResetMessage(null); setPasswordResetHasError(false);
    try {
      const response = await fetch('/api/auth/password-reset/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: passwordReset.token, password: passwordReset.password }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível redefinir a senha.');
      setPasswordResetMessage(payload.message); setPasswordAuthView('signin'); setPasswordSignIn((current) => ({ ...current, email: passwordReset.email }));
      window.history.replaceState({}, '', '/login');
    } catch (resetError) { setPasswordResetHasError(true); setPasswordResetMessage(resetError instanceof Error ? resetError.message : 'Não foi possível redefinir a senha.'); }
    finally { setPasswordResetLoading(false); }
  };

  const submitEmailLogin = async (email: string) => {
    const normalizedEmail = email.trim();
    const nextErrors: FieldErrors<RegistrationField> = {};

    if (!normalizedEmail) {
      nextErrors.email = requiredFieldError('seu email');
    } else if (!isValidEmail(normalizedEmail)) {
      nextErrors.email = 'Informe um email valido.';
    }

    setFieldErrors(nextErrors);

    if (hasFieldErrors(nextErrors)) {
      return false;
    }

    await onEmailLogin?.(normalizedEmail);
    return true;
  };

  if (!isOnboarding) {
    return (
      <div className="min-h-screen bg-bg px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
          <Card
            variant="default"
            className="w-full overflow-hidden rounded-sheet border border-border bg-surface shadow-sm"
          >
            <Card.Content className="px-6 py-12 sm:px-12 sm:py-14 lg:px-14 lg:py-16">
              <div className="flex flex-col items-center text-center">
                <GringoouLogo size={48} />
                <p className="mt-5 max-w-sm text-sm leading-6 text-slate-500 sm:text-base">
                  A rede social do imigrante brasileiro.
                </p>
              </div>

              <div className="mt-10 flex flex-col items-center gap-3">
                {googleEnabled ? (
                  <Button
                    type="button"
                    fullWidth
                    size="lg"
                    variant="ghost"
                    isDisabled={submitting}
                    onPress={submitGoogleLogin}
                    className="inline-flex h-14 w-full max-w-[360px] items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <GoogleIcon size={20} className="mr-2" />
                    {googleSubmitting ? 'Entrando...' : 'Continuar com Google'}
                  </Button>
                ) : null}

                {googleEnabled ? (
                  <Button
                    type="button"
                    fullWidth
                    size="lg"
                    variant="ghost"
                    isDisabled={submitting}
                    onPress={submitGoogleSelectAccount}
                    className="inline-flex h-12 w-full max-w-[360px] items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-none hover:bg-slate-50"
                  >
                    <GoogleIcon size={16} className="mr-2" />
                    Trocar conta Google
                  </Button>
                ) : null}

                <div className="flex w-full max-w-[360px] items-center gap-3">
                  <div aria-hidden="true" className="h-px flex-1 bg-slate-200/25" />
                  <span className="text-xs font-medium text-slate-400">ou</span>
                  <div aria-hidden="true" className="h-px flex-1 bg-slate-200/25" />
                </div>

                <Button
                  type="button"
                  fullWidth
                  size="lg"
                  variant="ghost"
                  onPress={() => openPasswordView('signin')}
                  className="h-14 w-full max-w-[360px] rounded-full border border-slate-200 bg-slate-100 px-6 text-sm font-semibold text-slate-400 shadow-none"
                >
                  Entrar com senha
                </Button>

                {passwordEnabled && passwordAuthView === 'none' ? (
                  <Button
                    type="button"
                    fullWidth
                    size="lg"
                    variant="primary"
                    onPress={() => openPasswordView('signup')}
                    className="h-14 w-full max-w-[360px] rounded-full bg-brand-500 px-6 text-base font-semibold text-white shadow-sm"
                  >
                    Criar minha conta
                  </Button>
                ) : null}

                {passwordAuthView === 'signin' ? (
                  <form
                    className="w-full max-w-[360px] space-y-3 pt-2"
                    onSubmit={async (event) => {
                      event.preventDefault();

                      const nextErrors: FieldErrors<RegistrationField> = {};

                      if (!passwordSignIn.email.trim()) {
                        nextErrors.email = requiredFieldError('seu email');
                      } else if (!isValidEmail(passwordSignIn.email)) {
                        nextErrors.email = 'Informe um email valido.';
                      }

                      if (passwordEnabled && !passwordSignIn.password.trim()) {
                        nextErrors.password = requiredFieldError('sua senha');
                      }

                      setFieldErrors(nextErrors);

                      if (hasFieldErrors(nextErrors)) {
                        return;
                      }

                      if (passwordEnabled) {
                        await onPasswordLogin?.({
                          email: passwordSignIn.email,
                          password: passwordSignIn.password,
                        });
                        return;
                      }

                      await submitEmailLogin(passwordSignIn.email);
                    }}
                  >
                    <Input
                      type="email"
                      placeholder="Seu email"
                      value={passwordSignIn.email}
                      onChange={(event) =>
                        setPasswordSignIn((current) => ({ ...current, email: event.target.value }))
                      }
                      onInput={() => clearFieldError('email')}
                      aria-invalid={Boolean(fieldErrors.email)}
                      className={inputClass}
                    />
                    <FieldErrorMessage message={fieldErrors.email} />

                    {passwordEnabled ? (
                      <>
                        <Input
                          type="password"
                          placeholder="Sua senha"
                          value={passwordSignIn.password}
                          onChange={(event) =>
                            setPasswordSignIn((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                          onInput={() => clearFieldError('password')}
                          aria-invalid={Boolean(fieldErrors.password)}
                          className={inputClass}
                        />
                        <FieldErrorMessage message={fieldErrors.password} />
                        <button type="button" onClick={() => { setPasswordReset((current) => ({ ...current, email: passwordSignIn.email })); setPasswordResetMessage(null); setPasswordResetHasError(false); setPasswordAuthView('forgot'); }} className="block w-full text-right text-xs font-semibold text-brand-500 hover:underline">Esqueci minha senha</button>
                      </>
                    ) : null}

                    <Button
                      type="submit"
                      fullWidth
                      size="lg"
                      variant="primary"
                      isDisabled={submitting}
                      className="h-14 rounded-full bg-brand-500 px-6 text-base font-semibold text-white shadow-sm"
                    >
                      {submitting ? 'Entrando...' : passwordEnabled ? 'Entrar' : 'Receber link'}
                    </Button>
                    <p className="text-center text-[11px] leading-5 text-slate-500">
                      Ao se cadastrar, voce concorda com nossos <a href="/termos-de-uso" className="font-semibold text-brand-500 hover:underline">Termos de Uso</a> e <a href="/politica-de-privacidade" className="font-semibold text-brand-500 hover:underline">Politica de Privacidade</a>.
                    </p>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      {passwordEnabled ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onPress={() => setPasswordAuthView('signup')}
                          className="px-0 text-sm font-semibold text-brand-500"
                        >
                          Criar conta
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        onPress={() => setPasswordAuthView('none')}
                        className="px-0 text-sm font-semibold text-slate-500"
                      >
                        Voltar
                      </Button>
                    </div>
                  </form>
                ) : null}

                {isPasswordRecoveryView ? (
                  <div className="w-full max-w-[360px] space-y-4 pt-2">
                    <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-slate-900">{passwordAuthView === 'reset' ? 'Crie uma nova senha' : 'Recuperar senha'}</p><p className="mt-1 text-xs leading-5 text-slate-500">{passwordAuthView === 'reset' ? 'Escolha uma senha forte para sua conta.' : 'Enviaremos um link seguro para o seu e-mail.'}</p></div><Button type="button" isIconOnly variant="ghost" onPress={() => setPasswordAuthView('signin')} aria-label="Voltar ao login" className="h-8 w-8 min-w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"><ArrowLeft size={17} /></Button></div>
                    {passwordAuthView === 'forgot' ? <Input type="email" placeholder="Seu e-mail" value={passwordReset.email} onChange={(event) => setPasswordReset((current) => ({ ...current, email: event.target.value }))} className={inputClass} /> : <><Input type="password" placeholder="Nova senha" value={passwordReset.password} onChange={(event) => setPasswordReset((current) => ({ ...current, password: event.target.value }))} className={inputClass} /><FieldErrorMessage message={fieldErrors.password} /><Input type="password" placeholder="Confirme a nova senha" value={passwordReset.confirmPassword} onChange={(event) => setPasswordReset((current) => ({ ...current, confirmPassword: event.target.value }))} className={inputClass} /><FieldErrorMessage message={fieldErrors.confirmPassword} /></>}
                    <Button type="button" fullWidth size="lg" variant="primary" isDisabled={passwordResetLoading} onPress={() => void (passwordAuthView === 'reset' ? confirmPasswordReset() : requestPasswordReset())} className="h-14 rounded-full bg-brand-500 px-6 font-semibold">{passwordResetLoading ? 'Aguarde...' : passwordAuthView === 'reset' ? 'Salvar nova senha' : 'Enviar link de recuperação'}</Button>
                    {passwordResetMessage ? <p className={`px-3 text-center text-xs font-medium leading-5 ${passwordResetHasError ? 'text-red-600' : 'text-brand-600'}`}>{passwordResetMessage}</p> : null}
                  </div>
                ) : null}

                {passwordAuthView === 'signup' ? (
                  <form
                    className="w-full max-w-[360px] space-y-3 pt-2"
                    onSubmit={async (event) => {
                      event.preventDefault();

                      const nextErrors: FieldErrors<RegistrationField> = {};

                      if (!passwordSignUp.email.trim()) {
                        nextErrors.email = requiredFieldError('seu email');
                      } else if (!isValidEmail(passwordSignUp.email)) {
                        nextErrors.email = 'Informe um email valido.';
                      }

                      if (!passwordSignUp.password.trim()) {
                        nextErrors.password = requiredFieldError('uma senha forte');
                      } else if (passwordIssues.length > 0) {
                        nextErrors.password = passwordIssues[0];
                      }

                      if (passwordSignUp.confirmPassword !== passwordSignUp.password) {
                        nextErrors.confirmPassword = 'As senhas precisam ser iguais.';
                      }

                      if (!passwordSignUp.captchaAnswer.trim()) {
                        nextErrors.captchaAnswer = 'Resolva o calculo de verificacao.';
                      }

                      setFieldErrors(nextErrors);

                      if (hasFieldErrors(nextErrors) || !captchaToken) {
                        if (!captchaToken) {
                          await loadCaptcha();
                        }
                        return;
                      }

                      await onPasswordRegister?.({
                        email: passwordSignUp.email,
                        password: passwordSignUp.password,
                        captchaToken,
                        captchaAnswer: passwordSignUp.captchaAnswer,
                      });
                    }}
                  >
                    <Input
                      type="email"
                      placeholder="Seu email"
                      value={passwordSignUp.email}
                      onChange={(event) =>
                        setPasswordSignUp((current) => ({ ...current, email: event.target.value }))
                      }
                      onInput={() => clearFieldError('email')}
                      aria-invalid={Boolean(fieldErrors.email)}
                      className={inputClass}
                    />
                    <FieldErrorMessage message={fieldErrors.email} />

                    <Input
                      type="password"
                      placeholder="Crie uma senha"
                      value={passwordSignUp.password}
                      onChange={(event) =>
                        setPasswordSignUp((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      onInput={() => clearFieldError('password')}
                      aria-invalid={Boolean(fieldErrors.password)}
                      className={inputClass}
                    />
                    <FieldErrorMessage message={fieldErrors.password} />

                    <Input
                      type="password"
                      placeholder="Confirmar senha"
                      value={passwordSignUp.confirmPassword}
                      onChange={(event) =>
                        setPasswordSignUp((current) => ({
                          ...current,
                          confirmPassword: event.target.value,
                        }))
                      }
                      onInput={() => clearFieldError('confirmPassword')}
                      aria-invalid={Boolean(fieldErrors.confirmPassword)}
                      className={inputClass}
                    />
                    <FieldErrorMessage message={fieldErrors.confirmPassword} />

                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="flex-1 text-sm font-medium text-slate-700">
                        {loadingCaptcha
                          ? 'Carregando captcha...'
                          : captchaPrompt || 'Captcha temporariamente indisponivel'}
                      </p>
                      <Button
                        type="button"
                        isIconOnly
                        variant="ghost"
                        onPress={() => void loadCaptcha()}
                        aria-label="Gerar novo captcha"
                        className="text-slate-500"
                      >
                        <RefreshCcw size={16} className={loadingCaptcha ? 'animate-spin' : ''} />
                      </Button>
                    </div>

                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Resultado"
                      value={passwordSignUp.captchaAnswer}
                      onChange={(event) =>
                        setPasswordSignUp((current) => ({
                          ...current,
                          captchaAnswer: event.target.value,
                        }))
                      }
                      onInput={() => clearFieldError('captchaAnswer')}
                      aria-invalid={Boolean(fieldErrors.captchaAnswer)}
                      className={inputClass}
                    />
                    <FieldErrorMessage message={fieldErrors.captchaAnswer} />

                    <Button
                      type="submit"
                      fullWidth
                      size="lg"
                      variant="primary"
                      isDisabled={submitting || loadingCaptcha}
                      className="h-14 rounded-full bg-brand-500 px-6 text-base font-semibold text-white shadow-sm"
                    >
                      {submitting ? 'Criando conta...' : 'Criar conta'}
                    </Button>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onPress={() => setPasswordAuthView('signin')}
                        className="px-0 text-sm font-semibold text-brand-500"
                      >
                        Entrar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onPress={() => setPasswordAuthView('none')}
                        className="px-0 text-sm font-semibold text-slate-500"
                      >
                        Voltar
                      </Button>
                    </div>
                  </form>
                ) : null}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                <a href="/termos-de-uso" className="transition-colors hover:text-slate-600 hover:underline">
                  Termos de uso
                </a>
                <span className="text-slate-300">•</span>
                <a href="/politica-de-privacidade" className="transition-colors hover:text-slate-600 hover:underline">
                  Politica de Privacidade
                </a>
              </div>

              {error && !isPasswordRecoveryView ? <p className="mt-6 text-center text-sm text-red-600">{error}</p> : null}
              {notice ? (
                <div className="mx-auto mt-6 flex w-full max-w-[360px] items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3 text-left ring-1 ring-brand-100">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-600"><MailCheck size={18} /></span>
                  <p className="text-sm font-semibold leading-5 text-brand-700">{notice}</p>
                </div>
              ) : null}
            </Card.Content>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-6 sm:px-6 lg:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-lg items-center justify-center">
        <div className="hidden">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/80 bg-white/70 px-4 py-2 shadow-sm backdrop-blur">
            <GringoouLogo size={22} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Gringoou
            </span>
          </div>

          <div className="max-w-2xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-500">
              Comunidade brasileira no exterior
            </p>
            <h1 className="max-w-xl text-5xl font-black leading-[0.96] tracking-tight text-slate-950">
              {isOnboarding
                ? 'Complete seu perfil'
                : 'Entre com um fluxo mais limpo, rápido e confiável'}
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600">
              {isOnboarding
                ? 'Precisamos da sua região para liberar comunidade, negócios e eventos locais.'
                : showGoogleOnlyAuth
                  ? 'Use o Google para acessar sua conta com menos atrito.'
                  : 'Use Google, email ou senha com uma interface mais clara e menos genérica.'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['Confiável', 'Autenticação com callback local pronta para teste.'],
              ['Mais limpa', 'Hierarquia visual forte, menos ruído e foco no essencial.'],
              ['Mais humana', 'A marca aparece com mais presença, sem cara de template.'],
            ].map(([title, text]) => (
              <Card
                key={title}
                variant="secondary"
                className="border border-white/80 bg-white/75 shadow-sm backdrop-blur"
              >
                <Card.Content className="space-y-2 p-4">
                  <p className="text-sm font-bold text-slate-900">{title}</p>
                  <p className="text-sm leading-6 text-slate-600">{text}</p>
                </Card.Content>
              </Card>
            ))}
          </div>
        </div>

        <Card
          variant="default"
          className="w-full overflow-hidden rounded-sheet border border-border bg-surface shadow-sm"
        >

          <Card.Content className="relative space-y-7 p-5 sm:p-8">
            <div className="flex justify-center">
              <GringoouLogo size={32} />
            </div>

            <div className="space-y-3 text-center">
              {isOnboarding ? <div className="mx-auto h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-1/3 rounded-full bg-brand-500" /></div> : null}
              <h2 className="text-h2 font-bold tracking-tight text-text">
                {isOnboarding ? 'Para te conectar melhor, precisamos te conhecer!' : 'Entre na sua conta'}
              </h2>
              <p className="mx-auto max-w-md text-sm leading-6 text-slate-600">
                {isOnboarding
                  ? 'Precisamos da sua região para liberar comunidade, negócios e eventos locais.'
                  : showGoogleOnlyAuth
                    ? 'Use o Google para acessar sua conta.'
                    : 'Use e-mail, Google ou senha para acessar sua conta.'}
              </p>
              {referralUsername ? (
                <div className="mx-auto inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
                  Você está entrando pelo link de @{normalizeUsernameInput(referralUsername)}
                </div>
              ) : null}
            </div>

            {!isOnboarding ? (
              <div className="space-y-6">
                {googleEnabled ? (
                  <Button
                    type="button"
                    fullWidth
                    size="lg"
                    variant="primary"
                    isDisabled={submitting}
                    onPress={submitGoogleLogin}
                    className="rounded-full bg-brand-500 font-semibold shadow-sm"
                  >
                    {googleSubmitting ? 'Entrando...' : 'Continuar com Google'}
                  </Button>
                ) : null}

                <div className="flex items-center gap-3">
                  <div aria-hidden="true" className="h-px flex-1 bg-slate-200/25" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                    ou
                  </span>
                  <div aria-hidden="true" className="h-px flex-1 bg-slate-200/25" />
                </div>

                {emailEnabled ? (
                  <form
                    className="space-y-4"
                    onSubmit={async (event) => {
                      event.preventDefault();

                      const nextErrors: FieldErrors<RegistrationField> = {};

                      if (!formValues.email.trim()) {
                        nextErrors.email = requiredFieldError('seu email');
                      } else if (!isValidEmail(formValues.email)) {
                        nextErrors.email = 'Informe um email valido.';
                      }

                      setFieldErrors(nextErrors);

                      if (hasFieldErrors(nextErrors)) {
                        return;
                      }

                      await onEmailLogin?.(formValues.email);
                    }}
                  >
                    <div className="space-y-2">
                      <p className={fieldLabel}>Email</p>
                      <Input
                        required
                        type="email"
                        placeholder="Seu melhor e-mail"
                        value={formValues.email}
                        onChange={(event) =>
                          setFormValues((current) => ({ ...current, email: event.target.value }))
                        }
                        onInput={() => clearFieldError('email')}
                        aria-invalid={Boolean(fieldErrors.email)}
                        className={inputClass}
                      />
                      <FieldErrorMessage message={fieldErrors.email} />
                    </div>
                    <Button
                      type="submit"
                      fullWidth
                      size="lg"
                      variant="outline"
                      isDisabled={submitting}
                      className="rounded-2xl border-slate-200 bg-slate-950 font-semibold text-white shadow-none hover:bg-slate-900"
                    >
                      {submitting ? 'Enviando link...' : 'Continuar com email'}
                    </Button>
                  </form>
                ) : null}

                {passwordEnabled ? (
                  <div className="space-y-4">
                    {passwordAuthView === 'none' ? (
                      <div className="grid gap-3">
                        <Button
                          type="button"
                          fullWidth
                          size="lg"
                          variant="outline"
                          onPress={() => openPasswordView('signin')}
                          className="rounded-2xl border-slate-200 bg-white font-semibold text-slate-900 shadow-sm"
                        >
                          Entrar com email e senha
                        </Button>
                        <Button
                          type="button"
                          fullWidth
                          size="lg"
                          variant="secondary"
                          onPress={() => openPasswordView('signup')}
                          className="rounded-2xl border border-slate-200 bg-slate-50 font-semibold text-slate-900 shadow-none"
                        >
                          Criar conta por email e senha
                        </Button>
                        <p className="px-2 text-center text-xs leading-6 text-slate-500">
                          Após o cadastro, enviaremos um link para confirmar seu email.
                        </p>
                      </div>
                    ) : null}

                    {passwordAuthView === 'signin' ? (
                      <form
                        className="w-full space-y-4"
                        onSubmit={async (event) => {
                          event.preventDefault();

                          const nextErrors: FieldErrors<RegistrationField> = {};

                          if (!passwordSignIn.email.trim()) {
                            nextErrors.email = requiredFieldError('seu email');
                          } else if (!isValidEmail(passwordSignIn.email)) {
                            nextErrors.email = 'Informe um email valido.';
                          }

                          if (!passwordSignIn.password.trim()) {
                            nextErrors.password = requiredFieldError('sua senha');
                          }

                          setFieldErrors(nextErrors);

                          if (hasFieldErrors(nextErrors)) {
                            return;
                          }

                          await onPasswordLogin?.({
                            email: passwordSignIn.email,
                            password: passwordSignIn.password,
                          });
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">Entrar com senha</p>
                            <p className="text-xs text-slate-500">
                              Use sua conta temporaria de email e senha.
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onPress={() => setPasswordAuthView('none')}
                            className="text-slate-500"
                          >
                            Voltar
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <p className={fieldLabel}>Email</p>
                          <Input
                            type="email"
                            placeholder="Seu e-mail"
                            value={passwordSignIn.email}
                            onChange={(event) =>
                              setPasswordSignIn((current) => ({ ...current, email: event.target.value }))
                            }
                            onInput={() => clearFieldError('email')}
                            aria-invalid={Boolean(fieldErrors.email)}
                            className={inputClass}
                          />
                          <FieldErrorMessage message={fieldErrors.email} />
                        </div>

                        <div className="space-y-2">
                          <p className={fieldLabel}>Senha</p>
                          <Input
                            type="password"
                            placeholder="Sua senha"
                            value={passwordSignIn.password}
                            onChange={(event) =>
                              setPasswordSignIn((current) => ({
                                ...current,
                                password: event.target.value,
                              }))
                            }
                            onInput={() => clearFieldError('password')}
                            aria-invalid={Boolean(fieldErrors.password)}
                            className={inputClass}
                          />
                          <FieldErrorMessage message={fieldErrors.password} />
                        </div>

                        <button type="button" onClick={() => { setPasswordReset((current) => ({ ...current, email: passwordSignIn.email })); setPasswordResetMessage(null); setPasswordResetHasError(false); setPasswordAuthView('forgot'); }} className="block w-full text-right text-xs font-semibold text-brand-500 hover:underline">Esqueci minha senha</button>

                        <Button
                          type="submit"
                          fullWidth
                          size="lg"
                          variant="primary"
                          isDisabled={submitting}
                   className="rounded-full bg-brand-500 font-semibold shadow-sm"
                        >
                          {submitting ? 'Entrando...' : 'Entrar com email e senha'}
                        </Button>
                        <p className="text-center text-[11px] leading-5 text-slate-500">
                          Ao se cadastrar, voce concorda com nossos <a href="/termos-de-uso" className="font-semibold text-brand-500 hover:underline">Termos de Uso</a> e <a href="/politica-de-privacidade" className="font-semibold text-brand-500 hover:underline">Politica de Privacidade</a>.
                        </p>
                      </form>
                    ) : null}

                    {isPasswordRecoveryView ? (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">{passwordAuthView === 'reset' ? 'Crie uma nova senha' : 'Recuperar senha'}</p><p className="mt-1 text-xs text-slate-500">{passwordAuthView === 'reset' ? 'Escolha uma senha forte para sua conta.' : 'Enviaremos um link seguro para o seu e-mail.'}</p></div><Button type="button" isIconOnly variant="ghost" onPress={() => setPasswordAuthView('signin')} aria-label="Voltar ao login" className="h-8 w-8 min-w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"><ArrowLeft size={17} /></Button></div>
                        {passwordAuthView === 'forgot' ? <Input type="email" placeholder="Seu e-mail" value={passwordReset.email} onChange={(event) => setPasswordReset((current) => ({ ...current, email: event.target.value }))} className={inputClass} /> : <><Input type="password" placeholder="Nova senha" value={passwordReset.password} onChange={(event) => setPasswordReset((current) => ({ ...current, password: event.target.value }))} className={inputClass} /><FieldErrorMessage message={fieldErrors.password} /><Input type="password" placeholder="Confirme a nova senha" value={passwordReset.confirmPassword} onChange={(event) => setPasswordReset((current) => ({ ...current, confirmPassword: event.target.value }))} className={inputClass} /><FieldErrorMessage message={fieldErrors.confirmPassword} /></>}
                        <Button type="button" fullWidth size="lg" variant="primary" isDisabled={passwordResetLoading} onPress={() => void (passwordAuthView === 'reset' ? confirmPasswordReset() : requestPasswordReset())} className="h-14 rounded-full bg-brand-500 px-6 font-semibold">{passwordResetLoading ? 'Aguarde...' : passwordAuthView === 'reset' ? 'Salvar nova senha' : 'Enviar link de recuperação'}</Button>
                        {passwordResetMessage ? <p className={`px-3 text-center text-xs font-medium leading-5 ${passwordResetHasError ? 'text-red-600' : 'text-brand-600'}`}>{passwordResetMessage}</p> : null}
                      </div>
                    ) : null}

                    {passwordAuthView === 'signup' ? (
                      <form
                        className="space-y-4"
                        onSubmit={async (event) => {
                          event.preventDefault();

                          const nextErrors: FieldErrors<RegistrationField> = {};

                          if (!passwordSignUp.email.trim()) {
                            nextErrors.email = requiredFieldError('seu email');
                          } else if (!isValidEmail(passwordSignUp.email)) {
                            nextErrors.email = 'Informe um email valido.';
                          }

                          if (!passwordSignUp.password.trim()) {
                            nextErrors.password = requiredFieldError('uma senha forte');
                          } else if (passwordIssues.length > 0) {
                            nextErrors.password = passwordIssues[0];
                          }

                          if (passwordSignUp.confirmPassword !== passwordSignUp.password) {
                            nextErrors.confirmPassword = 'As senhas precisam ser iguais.';
                          }

                          if (!passwordSignUp.captchaAnswer.trim()) {
                            nextErrors.captchaAnswer = 'Resolva o calculo de verificacao.';
                          }

                          setFieldErrors(nextErrors);

                          if (hasFieldErrors(nextErrors) || !captchaToken) {
                            if (!captchaToken) {
                              await loadCaptcha();
                            }
                            return;
                          }

                          await onPasswordRegister?.({
                            email: passwordSignUp.email,
                            password: passwordSignUp.password,
                            captchaToken,
                            captchaAnswer: passwordSignUp.captchaAnswer,
                          });
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">Criar sua conta</p>
                            <p className="text-xs text-slate-500">
                              Cadastro por email e senha sem verificacao por email.
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onPress={() => setPasswordAuthView('none')}
                            className="text-slate-500"
                          >
                            Voltar
                          </Button>
                        </div>

                        <Card variant="secondary" className={`${secondaryCardClass} border-amber-100 bg-amber-50`}>
                          <Card.Content className="p-4 text-xs leading-6 text-amber-800">
                            Após o cadastro, confirme seu email pelo link antes de entrar com a senha.
                          </Card.Content>
                        </Card>

                        <div className="space-y-2">
                          <p className={fieldLabel}>Email</p>
                          <Input
                            type="email"
                            placeholder="Seu e-mail"
                            value={passwordSignUp.email}
                            onChange={(event) =>
                              setPasswordSignUp((current) => ({ ...current, email: event.target.value }))
                            }
                            onInput={() => clearFieldError('email')}
                            aria-invalid={Boolean(fieldErrors.email)}
                            className={inputClass}
                          />
                          <FieldErrorMessage message={fieldErrors.email} />
                        </div>

                        <div className="space-y-2">
                          <p className={fieldLabel}>Senha</p>
                          <Input
                            type="password"
                            placeholder="Crie uma senha"
                            value={passwordSignUp.password}
                            onChange={(event) =>
                              setPasswordSignUp((current) => ({
                                ...current,
                                password: event.target.value,
                              }))
                            }
                            onInput={() => clearFieldError('password')}
                            aria-invalid={Boolean(fieldErrors.password)}
                            className={inputClass}
                          />
                          <FieldErrorMessage message={fieldErrors.password} />
                        </div>

                        {passwordSignUp.password ? (
                          <Card variant="secondary" className={`${secondaryCardClass} border-slate-200`}>
                            <Card.Content className="p-4 text-xs leading-6 text-slate-600">
                              {passwordIssues.length === 0 ? (
                                <p className="font-semibold text-emerald-700">Senha forte.</p>
                              ) : (
                                <div className="space-y-1">
                                  {passwordIssues.map((issue) => (
                                    <p key={issue}>{issue}</p>
                                  ))}
                                </div>
                              )}
                            </Card.Content>
                          </Card>
                        ) : null}

                        <div className="space-y-2">
                          <p className={fieldLabel}>Confirmar senha</p>
                          <Input
                            type="password"
                            placeholder="Confirme sua senha"
                            value={passwordSignUp.confirmPassword}
                            onChange={(event) =>
                              setPasswordSignUp((current) => ({
                                ...current,
                                confirmPassword: event.target.value,
                              }))
                            }
                            onInput={() => clearFieldError('confirmPassword')}
                            aria-invalid={Boolean(fieldErrors.confirmPassword)}
                            className={inputClass}
                          />
                          <FieldErrorMessage message={fieldErrors.confirmPassword} />
                        </div>

                        <Card variant="secondary" className={`${secondaryCardClass} border-slate-200`}>
                          <Card.Content className="space-y-4 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-700">
                                {loadingCaptcha
                                  ? 'Carregando captcha...'
                                  : captchaPrompt || 'Captcha temporariamente indisponivel'}
                              </p>
                              <Button
                                type="button"
                                isIconOnly
                                variant="ghost"
                                onPress={() => void loadCaptcha()}
                                aria-label="Gerar novo captcha"
                                className="text-slate-500"
                              >
                                <RefreshCcw size={16} className={loadingCaptcha ? 'animate-spin' : ''} />
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <p className={fieldLabel}>Resultado</p>
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="Resultado"
                                value={passwordSignUp.captchaAnswer}
                                onChange={(event) =>
                                  setPasswordSignUp((current) => ({
                                    ...current,
                                    captchaAnswer: event.target.value,
                                  }))
                                }
                                onInput={() => clearFieldError('captchaAnswer')}
                                aria-invalid={Boolean(fieldErrors.captchaAnswer)}
                                className={inputClass}
                              />
                              <FieldErrorMessage message={fieldErrors.captchaAnswer} />
                            </div>
                          </Card.Content>
                        </Card>

                        <Button
                          type="submit"
                          fullWidth
                          size="lg"
                          variant="primary"
                          isDisabled={submitting || loadingCaptcha}
                          className="rounded-full bg-brand-500 font-semibold shadow-sm"
                        >
                          {submitting ? 'Criando conta...' : 'Criar conta com email'}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ) : null}

                <Card variant="secondary" className={`${secondaryCardClass} border-slate-200`}>
                  <Card.Content className="p-4 text-center text-xs leading-6 text-slate-500">
                    {showGoogleOnlyAuth
                      ? 'Google cria ou reutiliza sua conta automaticamente.'
                      : emailEnabled
                        ? 'Email envia um magic link. Google cria ou reutiliza sua conta automaticamente.'
                        : 'Google ou email e senha liberam o acesso, e o perfil é concluído no próximo passo.'}
                  </Card.Content>
                </Card>
              </div>
            ) : (
              <form
                className="space-y-5"
                onSubmit={async (event) => {
                  event.preventDefault();

                  const nextErrors: FieldErrors<RegistrationField> = {};

                  if (!formValues.name.trim()) {
                    nextErrors.name = requiredFieldError('seu nome');
                  }

                  if (!formValues.username.trim()) {
                    nextErrors.username = requiredFieldError('seu nome publico');
                  } else if (usernameAvailable !== true) {
                    nextErrors.username = usernameFeedback || 'Escolha um nome publico disponivel.';
                  }

                  if (!formValues.regionKey.trim()) {
                    nextErrors.regionKey = requiredFieldError('uma regiao');
                  }

                  if (!formValues.gender) nextErrors.gender = requiredFieldError('seu genero');
                  const parsedAge = Number(formValues.age);
                  if (!formValues.age) nextErrors.age = requiredFieldError('sua idade');
                  else if (!Number.isInteger(parsedAge) || parsedAge < 18 || parsedAge > 120) nextErrors.age = 'Informe uma idade entre 18 e 120 anos.';
                  if (!formValues.timeAbroad) nextErrors.timeAbroad = requiredFieldError('seu tempo no exterior');
                  if (formValues.birthCity.trim().length < 2) nextErrors.birthCity = requiredFieldError('sua cidade natal');

                  const phoneError = validatePhoneField(formValues.phone, 'O telefone');

                  if (phoneError) {
                    nextErrors.phone = phoneError;
                  }

                  setFieldErrors(nextErrors);

                  if (hasFieldErrors(nextErrors)) {
                    return;
                  }

                  await onCompleteProfile?.({
                    ...formValues,
                    phone: buildInternationalPhone(selectedCountry.iso2, formValues.phone),
                    referralUsername,
                  });
                }}
              >
                <ProgressBar value={onboardingProgress} label="Conclusao do perfil" className="sticky top-0 z-20 -mx-1 rounded-2xl bg-white/95 p-3 backdrop-blur" />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className={fieldLabel}>Nome completo</p>
                    <Input
                      required
                      type="text"
                      placeholder="Nome completo"
                      value={formValues.name}
                      onChange={(event) =>
                        setFormValues((current) => ({ ...current, name: event.target.value }))
                      }
                      onInput={() => clearFieldError('name')}
                      aria-invalid={Boolean(fieldErrors.name)}
                      className={inputClass}
                    />
                    <FieldErrorMessage message={fieldErrors.name} />
                  </div>

                  <div className="space-y-2">
                    <p className={fieldLabel}>Nome público</p>
                    <Input
                      required
                      type="text"
                      placeholder="Nome publico (ex: joao-em-boston)"
                      value={formValues.username}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          username: normalizeUsernameInput(event.target.value),
                        }))
                      }
                      onInput={() => clearFieldError('username')}
                      aria-invalid={Boolean(fieldErrors.username)}
                      className={inputClass}
                    />
                    <p className="px-1 text-[11px] leading-5 text-slate-500">
                      Esse nome vai identificar seu perfil público e futuros links como{' '}
                      <span className="font-semibold text-slate-700">
                        gringoou.com/{normalizedUsername || 'joao'}
                      </span>
                    </p>
                    {usernameFeedback ? (
                      <Card
                        variant="secondary"
                        className={`shadow-none ${
                          usernameAvailable
                            ? 'border-emerald-100 bg-emerald-50'
                            : 'border-amber-100 bg-amber-50'
                        }`}
                      >
                        <Card.Content
                          className={`p-4 text-sm font-medium ${
                            usernameAvailable ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {checkingUsername ? 'Validando nome público...' : usernameFeedback}
                        </Card.Content>
                      </Card>
                    ) : null}
                    <FieldErrorMessage
                      message={
                        fieldErrors.username && fieldErrors.username !== usernameFeedback
                          ? fieldErrors.username
                          : null
                      }
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[170px_1fr]">
                    <label className="flex min-h-14 items-center rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
                      <div className="flex w-full items-center gap-2">
                        <img
                          src={selectedCountry.flagUrl}
                          className="w-5"
                          alt={selectedCountry.iso2.toUpperCase()}
                        />
                        <select
                          value={selectedCountryIso2}
                          onChange={(event) => {
                            setSelectedCountryIso2(event.target.value);
                            clearFieldError('phone');
                          }}
                          className="min-w-0 flex-1 appearance-none bg-transparent text-sm font-semibold text-slate-700 outline-none"
                        >
                          {COUNTRY_CALLING_CODE_OPTIONS.map((country) => (
                            <option key={country.iso2} value={country.iso2}>
                              {country.country}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs font-semibold text-slate-400">
                          {selectedCountry.dialCode}
                        </span>
                      </div>
                    </label>
                    <div className="space-y-2">
                     {/*  <p className={fieldLabel}>WhatsApp</p> */}
                      <Input
                        type="tel"
                        placeholder="WhatsApp"
                        value={formValues.phone}
                        onChange={(event) =>
                          setFormValues((current) => ({
                            ...current,
                            phone: formatPhoneInputByCountry(event.target.value, selectedCountry.iso2),
                          }))
                        }
                        onInput={() => clearFieldError('phone')}
                        aria-invalid={Boolean(fieldErrors.phone)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <FieldErrorMessage message={fieldErrors.phone} />
                  <p className="px-1 text-[11px] leading-5 text-slate-500">
                    O número será salvo com código internacional: {selectedCountry.dialCode}{' '}
                    99999-9999
                  </p>

                  <div className="space-y-2">
                    <p className={fieldLabel}>Email</p>
                    <Input
                      required
                      type="email"
                      placeholder="Seu melhor e-mail"
                      value={formValues.email}
                      disabled
                      className="h-14 rounded-2xl border border-slate-200 bg-slate-100 px-5 text-sm text-slate-500 shadow-sm placeholder:text-slate-400"
                    />
                  </div>

                  <RegionSelector
                    value={formValues.regionKey}
                    autoDetect
                    onChange={(region) => {
                      clearFieldError('regionKey');
                      setFormValues((current) => ({
                        ...current,
                        regionKey: region.key,
                      }));
                    }}
                    hint={
                      formValues.regionKey
                        ? 'Sua região inicial foi sugerida pela geolocalização, mas você pode trocar.'
                        : 'Selecione uma região existente para receber conteúdo local.'
                    }
                  />
                  <FieldErrorMessage message={fieldErrors.regionKey} />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className={fieldLabel}>Genero</p>
                      <select
                        value={formValues.gender}
                        onChange={(event) => {
                          clearFieldError('gender');
                          setFormValues((current) => ({ ...current, gender: event.target.value }));
                        }}
                        aria-invalid={Boolean(fieldErrors.gender)}
                        className={inputClass}
                      >
                        <option value="">Selecione</option>
                        <option value="MALE">Masculino</option>
                        <option value="FEMALE">Feminino</option>
                        <option value="OTHER">Outro</option>
                        <option value="PREFER_NOT_TO_SAY">Prefiro nao informar</option>
                      </select>
                      <FieldErrorMessage message={fieldErrors.gender} />
                    </div>
                    <div className="space-y-2">
                      <p className={fieldLabel}>Idade</p>
                      <Input
                        type="number"
                        min={18}
                        max={120}
                        value={formValues.age}
                        onChange={(event) => {
                          clearFieldError('age');
                          setFormValues((current) => ({ ...current, age: event.target.value }));
                        }}
                        aria-invalid={Boolean(fieldErrors.age)}
                        className={inputClass}
                      />
                      <FieldErrorMessage message={fieldErrors.age} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className={fieldLabel}>Tempo no exterior</p>
                    <select
                      value={formValues.timeAbroad}
                      onChange={(event) => {
                        clearFieldError('timeAbroad');
                        setFormValues((current) => ({ ...current, timeAbroad: event.target.value }));
                      }}
                      aria-invalid={Boolean(fieldErrors.timeAbroad)}
                      className={inputClass}
                    >
                      <option value="">Selecione</option>
                      <option value="LESS_THAN_ONE_YEAR">Menos de 1 ano</option>
                      <option value="ONE_TO_THREE_YEARS">1 a 3 anos</option>
                      <option value="THREE_TO_FIVE_YEARS">3 a 5 anos</option>
                      <option value="MORE_THAN_FIVE_YEARS">Mais de 5 anos</option>
                    </select>
                    <FieldErrorMessage message={fieldErrors.timeAbroad} />
                  </div>

                  <div className="space-y-2">
                    <p className={fieldLabel}>Cidade onde nasceu</p>
                    <Autocomplete
                      value={formValues.birthCity}
                      options={birthCityOptions}
                      placeholder="Busque ou informe sua cidade natal"
                      error={fieldErrors.birthCity}
                      onChange={(birthCity) => {
                        clearFieldError('birthCity');
                        setFormValues((current) => ({ ...current, birthCity }));
                      }}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  variant="primary"
                  isDisabled={submitting || onboardingBlocked}
                  className="rounded-full bg-brand-500 py-2 px-5 font-semibold shadow-sm"
                >
                  {submitting
                    ? 'Salvando...'
                    : checkingUsername
                      ? 'Validando nome...'
                       : 'Continuar'}
                </Button>
                <p className="px-2 text-center text-[11px] leading-5 text-slate-500">
                  Ao se cadastrar, voce concorda com nossos{' '}
                  <a href="/termos-de-uso" className="font-semibold text-brand-500 hover:underline">Termos de Uso</a>
                  {' '}e{' '}
                  <a href="/politica-de-privacidade" className="font-semibold text-brand-500 hover:underline">Politica de Privacidade</a>.
                </p>
              </form>
            )}

            {error && !isPasswordRecoveryView ? (
              <Card variant="secondary" className="border border-red-100 bg-red-50 shadow-none">
                <Card.Content className="p-4 text-sm font-medium text-red-600">{error}</Card.Content>
              </Card>
            ) : null}

            {notice ? (
              <div className="flex items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3 ring-1 ring-brand-100">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-600"><MailCheck size={18} /></span>
                <p className="text-sm font-semibold leading-5 text-brand-700">{notice}</p>
              </div>
            ) : null}

            <Card variant="secondary" className={`${secondaryCardClass} border-slate-200`}>
              <Card.Content className="flex items-center gap-3 p-4">
                <Shield size={18} className="flex-shrink-0 text-brand-500" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Ambiente seguro, com autenticação e conteúdo local.
                </p>
              </Card.Content>
            </Card>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default Registration;
