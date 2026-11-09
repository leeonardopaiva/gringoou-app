'use client';

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { Alert, Card } from '@/components/ui';
import { useState } from 'react';
import { Gift } from 'lucide-react';
import { formatAdCurrency } from '@/lib/ads/contracts';
import { useAdPlans } from '@/hooks/useAdPlans';
import type { AdWizardData } from '@/lib/ads/validation';

export const AD_PAYMENT_FORM_ID = 'ad-payment-form';
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? '';
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function PaymentForm({ campaignId, onProcessing, onSuccess, onError }: { campaignId?: string; onProcessing: (value: boolean) => void; onSuccess: () => void; onError: (message: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();

  return (
    <form
      id={AD_PAYMENT_FORM_ID}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!stripe || !elements) return;
        onProcessing(true);
        onError('');
        const result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/ads/anuncio-em-analise${campaignId ? `?campaign=${encodeURIComponent(campaignId)}` : ''}`,
          },
          redirect: 'if_required',
        });
        onProcessing(false);
        if (result.error) return onError(result.error.message ?? 'Nao foi possivel confirmar o pagamento.');
        if (result.paymentIntent?.status === 'succeeded' || result.paymentIntent?.status === 'processing') onSuccess();
      }}
    >
      <PaymentElement options={{ layout: 'tabs' }} />
    </form>
  );
}

export function CheckoutStep({ state, clientSecret, error, onProcessing, onSuccess, onError, onRedeemCoupon }: { onRedeemCoupon: (code: string) => Promise<string | null>; state: AdWizardData; clientSecret: string | null; error: string | null; onProcessing: (value: boolean) => void; onSuccess: () => void; onError: (message: string) => void }) {
  const plans = useAdPlans();
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const planInfo = plans?.find((item) => item.plan === state.plan);
  if (!state.plan || !state.durationMonths || !planInfo) return null;
  const amount = planInfo.monthlyPriceCents * state.durationMonths;

  return (
    <Card className="rounded-3xl border border-slate-200 p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#078cf5] text-xs font-bold text-white">4</span><Card.Title className="text-[17px]">Checkout</Card.Title></div>
      <div className="grid gap-5 lg:grid-cols-2">
      <Card className="border border-slate-200 bg-[#fbfcfd] shadow-none">
        <Card.Title>Resumo do contrato</Card.Title>
        <div className="mt-5 divide-y divide-border rounded-2xl border border-border bg-white px-5">
          {[['Plano', planInfo.name], ['Vigencia', `${state.durationMonths} ${state.durationMonths === 1 ? 'mes' : 'meses'}`], ['Regiao', state.regionKey]].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 py-3.5 text-body-sm"><span className="text-muted-foreground">{label}</span><strong className="text-right text-text">{value}</strong></div>)}
        </div>
        <div className="mt-5 rounded-2xl bg-[#eaf5ff] p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[#176daa]">Total em dolar americano</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight text-[#0787f9]">{formatAdCurrency(amount)}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">Valor calculado e validado no servidor. A campanha segue para analise depois da confirmacao do Stripe.</p>
        </div>
      </Card>
      <Card className="self-start border border-slate-200 bg-[#fbfcfd] shadow-none">
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
          {couponOpen ? (
            <form
              className="space-y-2"
              onSubmit={async (event) => {
                event.preventDefault();
                setCouponBusy(true);
                setCouponError(null);
                const message = await onRedeemCoupon(couponCode.trim());
                setCouponBusy(false);
                if (message) setCouponError(message);
              }}
            >
              <label className="block text-xs font-bold text-slate-500">Código do cupom
                <div className="mt-1 flex gap-2">
                  <input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-[#078cf5]" autoFocus />
                  <button type="submit" disabled={couponBusy || couponCode.trim().length < 4} className="shrink-0 rounded-xl bg-[#078cf5] px-4 text-sm font-bold text-white disabled:opacity-50">{couponBusy ? 'Aplicando...' : 'Aplicar'}</button>
                </div>
              </label>
              {couponError ? <p className="text-xs font-medium text-red-600">{couponError}</p> : null}
              <p className="text-[11px] text-slate-400">Cupom de cortesia libera esta campanha sem cobrança.</p>
            </form>
          ) : (
            <button type="button" onClick={() => setCouponOpen(true)} className="inline-flex items-center gap-2 text-sm font-semibold text-[#078cf5] hover:underline"><Gift size={16} /> Tenho um cupom</button>
          )}
        </div>
        <div className="flex items-center gap-2"><ShieldCheck size={20} className="text-emerald-600" /><Card.Title>Pagamento seguro</Card.Title></div>
        <Card.Description className="mb-5 mt-1">Seus dados de cartao sao processados diretamente pelo Stripe.</Card.Description>
        {!publishableKey ? <Alert tone="erro" title="Stripe nao configurado" description="Configure NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY." /> : null}
        {error ? <Alert className="mb-4" tone="erro" title="Falha no pagamento" description={error} /> : null}
        {stripePromise && clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#6d28d9', borderRadius: '16px' } } }}>
            <PaymentForm
              campaignId={state.draftId}
              onProcessing={onProcessing}
              onSuccess={onSuccess}
              onError={onError}
            />
          </Elements>
        ) : publishableKey ? <p className="text-body-sm text-muted-foreground">Preparando formulario de pagamento...</p> : null}
        <div className="mt-5 flex items-center gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500"><LockKeyhole size={14} /> Dados criptografados e protegidos pelo Stripe.</div>
      </Card>
      </div>
    </Card>
  );
}
