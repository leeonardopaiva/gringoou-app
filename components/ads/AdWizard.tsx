'use client';

import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { useToast } from '@/components/feedback/ToastProvider';
import { adCreativeStepSchema, adGoalStepSchema, adReachStepSchema, type AdWizardData } from '@/lib/ads/validation';
import { CheckoutStep, AD_PAYMENT_FORM_ID } from './steps/CheckoutStep';
import { CreativeStep } from './steps/CreativeStep';
import { GoalStep } from './steps/GoalStep';
import { ReachAndPlanStep } from './steps/ReachAndPlanStep';
import type { AdFieldErrors } from './types';
import { WizardStepper } from './WizardStepper';
import { useAdAccount } from './AdAccountProvider';
import { formatAdCurrency, getAdCheckoutAmount, isAdsSmokeTestModeEnabled } from '@/lib/ads/contracts';

const LEGACY_STORAGE_KEY = 'gringoou:ad-wizard-draft';
const STORAGE_KEY_PREFIX = 'gringoou:ad-wizard-draft';
const STEPS = ['Objetivo', 'Criativo', 'Alcance', 'Checkout'];

const initialState: AdWizardData = {
  step: 1,
  headline: '',
  description: '',
  imageUrl: '',
  ctaLabel: 'Saiba mais',
  destination: '',
  regionKey: '',
};

type Action =
  | { type: 'PATCH'; payload: Partial<AdWizardData> }
  | { type: 'STEP'; payload: AdWizardData['step'] }
  | { type: 'HYDRATE'; payload: AdWizardData }
  | { type: 'RESET' };

const reducer = (state: AdWizardData, action: Action): AdWizardData => {
  if (action.type === 'PATCH') return { ...state, ...action.payload };
  if (action.type === 'STEP') return { ...state, step: action.payload };
  if (action.type === 'RESET') return { ...initialState };
  return { ...initialState, ...action.payload };
};

const getErrors = (issues: Array<{ path: PropertyKey[]; message: string }>) =>
  issues.reduce<AdFieldErrors>((errors, issue) => {
    const field = issue.path[0] as keyof AdWizardData;
    if (field && !errors[field]) errors[field] = issue.message;
    return errors;
  }, {});

export const AdWizard: React.FC = () => {
  const router = useRouter();
  const { account, loading: accountLoading, setAccountSwitchLocked } = useAdAccount();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydratedAccountId, setHydratedAccountId] = useState<string | null>(null);
  const [errors, setErrors] = useState<AdFieldErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const checkoutKeyRef = useRef<string | null>(null);
  const { showToast } = useToast();
  const checkoutAmount = state.plan && state.durationMonths
    ? getAdCheckoutAmount(state.plan, state.durationMonths)
    : 0;
  const smokeTestMode = isAdsSmokeTestModeEnabled();
  const canPay = account?.role === 'BUSINESS_ADMIN';
  const storageKey = account?.id ? `${STORAGE_KEY_PREFIX}:${account.id}` : null;
  const hydrated = Boolean(account?.id && hydratedAccountId === account.id);

  useEffect(() => {
    if (!account?.id) {
      setHydratedAccountId(null);
      return;
    }
    setHydratedAccountId(null);
    dispatch({ type: 'RESET' });
    setErrors({});
    setRequestError(null);
    setClientSecret(null);
    setPaymentSubmitted(false);
    setPaymentProcessing(false);
    checkoutKeyRef.current = null;
    const nextStorageKey = `${STORAGE_KEY_PREFIX}:${account.id}`;
    try {
      sessionStorage.removeItem(LEGACY_STORAGE_KEY);
      const stored = sessionStorage.getItem(nextStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as AdWizardData & { bannerId?: string };
        dispatch({ type: 'HYDRATE', payload: { ...parsed, draftId: parsed.draftId ?? parsed.bannerId } });
      }
    } catch {
      sessionStorage.removeItem(nextStorageKey);
    } finally {
      setHydratedAccountId(account.id);
    }
  }, [account?.id]);

  useEffect(() => {
    if (hydrated && storageKey) sessionStorage.setItem(storageKey, JSON.stringify(state));
  }, [hydrated, state, storageKey]);

  useEffect(() => {
    setAccountSwitchLocked(paymentProcessing);
    return () => setAccountSwitchLocked(false);
  }, [paymentProcessing, setAccountSwitchLocked]);

  const patch = (payload: Partial<AdWizardData>) => {
    dispatch({ type: 'PATCH', payload });
    setErrors((current) => {
      const next = { ...current };
      Object.keys(payload).forEach((key) => delete next[key as keyof AdWizardData]);
      return next;
    });
    setRequestError(null);
  };

  const saveDraft = useCallback(async (showSuccess = false) => {
    const creative = adCreativeStepSchema.safeParse(state);
    if (!creative.success) {
      setErrors(getErrors(creative.error.issues));
      return null;
    }

    setSaving(true);
    setRequestError(null);
    try {
      const response = await fetch('/api/banners/draft', {
        method: state.draftId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state, bannerId: state.draftId, adAccountId: account?.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Nao foi possivel salvar o rascunho.');
      const draftId = payload.banner.id as string;
      dispatch({ type: 'PATCH', payload: { draftId } });
      if (showSuccess) showToast('Rascunho salvo.', 'success');
      return draftId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel salvar o rascunho.';
      setRequestError(message);
      if (showSuccess) showToast(message, 'error');
      return null;
    } finally {
      setSaving(false);
    }
  }, [account?.id, showToast, state]);

  const preparePayment = useCallback(async (draftId: string) => {
    if (!state.plan || !state.durationMonths) return false;
    setSaving(true);
    setRequestError(null);
    checkoutKeyRef.current ??= `ad-payment-${draftId}-${crypto.randomUUID()}`;
    try {
      const response = await fetch('/api/ads/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state, bannerId: draftId, adAccountId: account?.id, idempotencyKey: checkoutKeyRef.current }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Nao foi possivel preparar o pagamento.');
      if (!payload?.clientSecret) throw new Error('O Stripe nao retornou o client secret.');
      setClientSecret(payload.clientSecret);
      return true;
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Nao foi possivel preparar o pagamento.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [account?.id, state]);

  useEffect(() => {
    if (hydrated && canPay && state.step === 4 && state.draftId && !clientSecret && !paymentSubmitted) {
      void preparePayment(state.draftId);
    }
  }, [canPay, clientSecret, hydrated, paymentSubmitted, preparePayment, state.draftId, state.step]);

  const nextStep = async () => {
    if (state.step === 1) {
      const parsed = adGoalStepSchema.safeParse(state);
      if (!parsed.success) return setErrors(getErrors(parsed.error.issues));
      dispatch({ type: 'STEP', payload: 2 });
      return;
    }
    if (state.step === 2) {
      const parsed = adCreativeStepSchema.safeParse(state);
      if (!parsed.success) return setErrors(getErrors(parsed.error.issues));
      if (await saveDraft()) dispatch({ type: 'STEP', payload: 3 });
      return;
    }
    if (state.step === 3) {
      const parsed = adReachStepSchema.safeParse(state);
      if (!parsed.success) return setErrors(getErrors(parsed.error.issues));
      const draftId = await saveDraft();
      if (!draftId) return;
      if (!canPay) {
        setRequestError('Rascunho salvo. Apenas o administrador principal da conta pode concluir o pagamento.');
        return;
      }
      dispatch({ type: 'STEP', payload: 4 });
      await preparePayment(draftId);
    }
  };

  if (accountLoading || !account) {
    return <div className="mx-auto max-w-[1080px] rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Carregando conta comercial...</div>;
  }

  if (!account.businessId) {
    return (
      <div className="mx-auto max-w-[720px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-500">Antes de promover</p>
        <h1 className="mt-2 text-2xl font-extrabold text-[#132f40]">Ative a página do seu negócio</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Revise os dados públicos de <strong>{account.name}</strong>. A página será vinculada a esta conta Ads e enviada para aprovação.</p>
        <Button className="mt-6" onClick={() => router.push(`/negocios?create=1&adAccountId=${encodeURIComponent(account.id)}`)}>Criar página do negócio</Button>
      </div>
    );
  }

  if (account.businessStatus !== 'PUBLISHED') {
    return (
      <div className="mx-auto max-w-[720px] rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-700">Página em análise</p>
        <h1 className="mt-2 text-2xl font-extrabold text-[#132f40]">A promoção será liberada após a aprovação</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Você pode revisar a página agora. Assim que ela for aprovada pela moderação, a criação de campanhas será liberada automaticamente.</p>
        {account.publicPath ? <Button className="mt-6" variant="secondary" onClick={() => router.push(`${account.publicPath}/gerenciar`)}>Ver página do negócio</Button> : null}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1160px] pb-28">
      <header className="mb-8">
        <p className="text-[10px] font-bold text-slate-400">Criar Anuncio</p>
        <div className="mt-1 flex items-end justify-between gap-4">
          <h1 className="text-[28px] font-extrabold leading-tight text-[#132f40]">Novo Anuncio</h1>
          {state.draftId ? <span className="text-[10px] font-semibold text-slate-400">Rascunho salvo</span> : null}
        </div>
        <WizardStepper currentStep={state.step} steps={STEPS} className="mt-5" />
      </header>

      {requestError ? <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-body-sm text-red-700">{requestError}</div> : null}
      {paymentSubmitted ? <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-body-sm text-emerald-700">Pagamento recebido ou em processamento. A campanha sera enviada para moderacao pelo webhook do Stripe.</div> : null}
      {smokeTestMode ? <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-800">Modo de teste de cobranca ativo. O checkout usa valor simbolico para homologacao em conta live.</div> : null}

      {state.step === 1 ? <GoalStep state={state} errors={errors} patch={patch} /> : null}
      {state.step === 2 ? <CreativeStep state={state} errors={errors} patch={patch} /> : null}
      {state.step === 3 ? <ReachAndPlanStep state={state} errors={errors} patch={patch} /> : null}
      {state.step === 4 ? <CheckoutStep state={state} clientSecret={clientSecret} error={requestError} onProcessing={setPaymentProcessing} onError={setRequestError} onSuccess={() => {
        setPaymentSubmitted(true);
        if (storageKey) sessionStorage.removeItem(storageKey);
        showToast('Pagamento enviado. Campanha aguardando moderacao.', 'success');
        router.replace(`/ads/anuncio-em-analise${state.draftId ? `?campaign=${encodeURIComponent(state.draftId)}` : ''}`);
      }} /> : null}

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-[#f5f7f9]/95 px-4 py-4 backdrop-blur md:left-[272px] md:px-9">
        <div className="mx-auto grid max-w-[1080px] grid-cols-3 items-center gap-3">
          <div><Button variant="ghost" disabled={state.step === 1 || saving || paymentProcessing} onClick={() => dispatch({ type: 'STEP', payload: Math.max(1, state.step - 1) as AdWizardData['step'] })}>Voltar</Button></div>
          <div className="flex justify-center">{state.step >= 2 && state.step < 4 ? <Button variant="ghost" loading={saving} onClick={() => void saveDraft(true)}>Salvar rascunho</Button> : null}</div>
          <div className="flex justify-end">{state.step < 4 ? <Button loading={saving} disabled={state.step === 1 && !state.goal} onClick={() => void nextStep()}>Continuar</Button> : <Button type="submit" form={AD_PAYMENT_FORM_ID} loading={paymentProcessing || saving} disabled={!clientSecret || paymentSubmitted}>Pagar {formatAdCurrency(checkoutAmount)} e Enviar para Analise</Button>}</div>
        </div>
      </footer>
    </div>
  );
};

export default AdWizard;
