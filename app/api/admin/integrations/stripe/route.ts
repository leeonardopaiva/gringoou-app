import { AdModerationStatus, AdPaymentStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getAdPlanCatalog } from '@/lib/ads/plans';
import { getStripe } from '@/lib/ads/server';
import { prisma } from '@/lib/prisma';
import { requireRootSession } from '@/lib/root-admin';

export const runtime = 'nodejs';

type CheckStatus = 'ok' | 'warn' | 'error';
type Check = { id: string; label: string; status: CheckStatus; detail: string };

const REQUIRED_EVENTS = ['payment_intent.succeeded', 'payment_intent.payment_failed', 'payment_intent.canceled', 'charge.refunded'];

/** Mostra só o tipo e os 4 últimos caracteres: o valor da chave nunca sai do servidor. */
const mask = (value?: string) => {
  const key = value?.trim();
  if (!key) return null;
  const match = /^([a-z]{2}_(?:test|live))_/.exec(key);
  return `${match?.[1] ?? 'chave'}_…${key.slice(-4)}`;
};
const modeOf = (value?: string) => (/_live_/.test(value ?? '') ? 'live' : /_test_/.test(value ?? '') ? 'test' : null);
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Erro desconhecido.');

/**
 * Diagnóstico da integração Stripe (somente administrador raiz). Faz consultas de leitura no Stripe e
 * no banco; não cria cobranças nem altera dados. As chaves continuam só no ambiente do servidor.
 */
export async function POST() {
  const { response } = await requireRootSession();
  if (response) return response;

  const checks: Check[] = [];
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  const secretMode = modeOf(secret);
  const publishableMode = modeOf(publishable);

  checks.push(
    secret
      ? { id: 'secret', label: 'Chave secreta', status: secret.startsWith('sk_') || secret.startsWith('rk_') ? 'ok' : 'error', detail: `${mask(secret)} (${secretMode === 'live' ? 'modo live' : secretMode === 'test' ? 'modo teste' : 'formato desconhecido'})` }
      : { id: 'secret', label: 'Chave secreta', status: 'error', detail: 'STRIPE_SECRET_KEY não configurada.' },
  );
  checks.push(
    publishable
      ? { id: 'publishable', label: 'Chave pública', status: publishable.startsWith('pk_') ? 'ok' : 'error', detail: `${mask(publishable)} (${publishableMode === 'live' ? 'modo live' : publishableMode === 'test' ? 'modo teste' : 'formato desconhecido'})` }
      : { id: 'publishable', label: 'Chave pública', status: 'error', detail: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY não configurada: o formulário de pagamento não abre.' },
  );
  if (secretMode && publishableMode && secretMode !== publishableMode) {
    checks.push({ id: 'mode', label: 'Modos compatíveis', status: 'error', detail: `A chave secreta é ${secretMode} e a pública é ${publishableMode}. As duas precisam ser do mesmo modo.` });
  } else if (secretMode) {
    checks.push({ id: 'mode', label: 'Modo de operação', status: secretMode === 'live' ? 'ok' : 'warn', detail: secretMode === 'live' ? 'Live: pagamentos reais.' : 'Teste: nenhuma cobrança real será feita.' });
  }
  checks.push(
    webhookSecret?.startsWith('whsec_')
      ? { id: 'webhook-secret', label: 'Segredo do webhook', status: 'ok', detail: `whsec_…${webhookSecret.slice(-4)}` }
      : { id: 'webhook-secret', label: 'Segredo do webhook', status: 'error', detail: 'STRIPE_WEBHOOK_SECRET ausente ou fora do formato whsec_.' },
  );

  let stripe: ReturnType<typeof getStripe> | null = null;
  if (secret) {
    try {
      stripe = getStripe();
      const balance = await stripe.balance.retrieve();
      checks.push({ id: 'connection', label: 'Conexão com o Stripe', status: 'ok', detail: `Chave aceita pelo Stripe (${balance.livemode ? 'live' : 'teste'}).` });
      if (secretMode && balance.livemode !== (secretMode === 'live')) {
        checks.push({ id: 'livemode', label: 'Modo confirmado', status: 'warn', detail: 'O modo informado pelo Stripe difere do prefixo da chave.' });
      }
    } catch (error) {
      stripe = null;
      checks.push({ id: 'connection', label: 'Conexão com o Stripe', status: 'error', detail: `O Stripe recusou a chave: ${errorMessage(error)}` });
    }
  }

  if (stripe) {
    try {
      const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
      const base = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
      const expectedUrl = base ? `${base}/api/webhooks/stripe` : null;
      const endpoint = endpoints.data.find((item) => (expectedUrl ? item.url === expectedUrl : item.url.endsWith('/api/webhooks/stripe')));
      if (!endpoint) {
        checks.push({ id: 'endpoint', label: 'Endpoint do webhook', status: 'error', detail: `Nenhum endpoint cadastrado para ${expectedUrl ?? '/api/webhooks/stripe'}. Cadastre em Developers → Webhooks.` });
      } else {
        const missing = endpoint.enabled_events.includes('*') ? [] : REQUIRED_EVENTS.filter((event) => !endpoint.enabled_events.includes(event));
        checks.push({
          id: 'endpoint',
          label: 'Endpoint do webhook',
          status: endpoint.status !== 'enabled' ? 'error' : missing.length ? 'error' : 'ok',
          detail: endpoint.status !== 'enabled' ? `Endpoint ${endpoint.status}.` : missing.length ? `Faltam os eventos: ${missing.join(', ')}.` : `${endpoint.url} ativo com os eventos necessários.`,
        });
      }
    } catch (error) {
      checks.push({ id: 'endpoint', label: 'Endpoint do webhook', status: 'warn', detail: `Não foi possível consultar (a chave pode não ter permissão de leitura de webhooks): ${errorMessage(error)}` });
    }

    try {
      const events = await stripe.events.list({ limit: 20, types: ['payment_intent.succeeded', 'payment_intent.payment_failed'] });
      const undelivered = events.data.filter((event) => event.pending_webhooks > 0);
      checks.push({
        id: 'events',
        label: 'Entrega dos eventos',
        status: undelivered.length ? 'warn' : 'ok',
        detail: events.data.length === 0
          ? 'Nenhum evento de pagamento recente.'
          : undelivered.length
            ? `${undelivered.length} de ${events.data.length} eventos recentes ainda aguardam entrega ao webhook (falha ou atraso).`
            : `Os ${events.data.length} eventos recentes foram entregues.`,
      });
    } catch (error) {
      checks.push({ id: 'events', label: 'Entrega dos eventos', status: 'warn', detail: `Não foi possível consultar: ${errorMessage(error)}` });
    }
  }

  try {
    const [stuck, plans] = await Promise.all([
      prisma.banner.count({
        where: { adAccountId: { not: null }, moderationStatus: AdModerationStatus.DRAFT, paymentStatus: AdPaymentStatus.PENDING, payments: { some: { provider: 'STRIPE' } } },
      }),
      getAdPlanCatalog(),
    ]);
    checks.push({
      id: 'stuck',
      label: 'Campanhas aguardando confirmação',
      status: stuck ? 'warn' : 'ok',
      detail: stuck ? `${stuck} campanha(s) em rascunho com pagamento iniciado. Use "Verificar pagamentos pendentes".` : 'Nenhuma campanha parada.',
    });
    const active = plans.filter((plan) => plan.isActive).length;
    checks.push({ id: 'plans', label: 'Pacotes de anúncio', status: active ? 'ok' : 'error', detail: active ? `${active} pacote(s) ativo(s) (cobrança em USD).` : 'Nenhum pacote ativo: ninguém consegue contratar.' });
  } catch (error) {
    checks.push({ id: 'db', label: 'Banco de dados', status: 'error', detail: errorMessage(error) });
  }

  return NextResponse.json({ checkedAt: new Date().toISOString(), ok: checks.every((check) => check.status !== 'error'), checks });
}
