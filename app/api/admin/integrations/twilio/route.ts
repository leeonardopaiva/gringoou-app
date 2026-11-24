import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { z } from 'zod';
import { getAllowedPhoneCountries, isPhoneVerificationEnabled, toE164Phone } from '@/lib/phone-verification';
import { consumeRateLimit } from '@/lib/rate-limit';
import { requireRootSession } from '@/lib/root-admin';

export const runtime = 'nodejs';

type CheckStatus = 'ok' | 'warn' | 'error';
type Check = { id: string; label: string; status: CheckStatus; detail: string };

const tail = (value?: string) => (value?.trim() ? `${value.trim().slice(0, 2)}…${value.trim().slice(-4)}` : null);

const twilioError = (error: unknown) => {
  const details = error as { status?: number; code?: number; message?: string };
  return { code: details?.code ?? null, status: details?.status ?? null, message: details?.message ?? 'Erro desconhecido.' };
};

// Friendly hints for the Twilio errors seen in practice.
const hintFor = (code: number | null) => {
  switch (code) {
    case 20003:
      return 'Credenciais recusadas: o Account SID e o Auth Token não combinam ou o token foi trocado.';
    case 20404:
      return 'Serviço não encontrado nessa conta: o Verify Service SID é de outra conta Twilio.';
    case 21608:
      return 'Conta Trial: só envia para números verificados no console do Twilio.';
    case 60410:
      return 'Bloqueado pelo antifraude do Twilio para este número.';
    case 60605:
    case 21408:
      return 'País não habilitado nas Geo permissions do Twilio.';
    case 60203:
      return 'Limite de envios do Twilio para este número. Aguarde e tente de novo.';
    case 60200:
    case 21211:
      return 'Número inválido.';
    default:
      return null;
  }
};

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('diagnose') }),
  z.object({ action: z.literal('send'), phone: z.string().trim().min(8).max(30) }),
  z.object({ action: z.literal('check'), phone: z.string().trim().min(8).max(30), code: z.string().trim().regex(/^\d{4,8}$/) }),
]);

/**
 * Diagnóstico e teste do Twilio Verify (somente administrador raiz).
 * - diagnose: consultas de leitura na conta e no serviço; não envia SMS.
 * - send / check: envia e confere um código de teste (um SMS real). Não altera nenhum usuário.
 * As credenciais ficam só no ambiente do servidor; só aparecem os 4 últimos caracteres.
 */
export async function POST(request: Request) {
  const { session, response } = await requireRootSession();
  if (response) return response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({ action: 'diagnose' })));
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  const input = parsed.data;

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

  if (input.action !== 'diagnose') {
    if (!accountSid || !authToken || !serviceSid) {
      return NextResponse.json({ error: 'Twilio Verify não está configurado neste ambiente.' }, { status: 503 });
    }

    const phone = toE164Phone(input.phone);
    if (!phone) return NextResponse.json({ error: 'Use o telefone com o código do país, por exemplo +1 305 000 0000.' }, { status: 400 });

    // Each test send costs money, so the admin is limited too.
    const limit = await consumeRateLimit({
      scope: 'admin:twilio-test',
      key: `admin:${session?.user?.id ?? 'unknown'}`,
      max: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) return NextResponse.json({ error: 'Muitos testes. Tente novamente mais tarde.' }, { status: 429 });

    const client = twilio(accountSid, authToken);
    try {
      if (input.action === 'send') {
        const verification = await client.verify.v2.services(serviceSid).verifications.create({ to: phone, channel: 'sms' });
        return NextResponse.json({ ok: true, message: `Código enviado para ${phone} (status: ${verification.status}).` });
      }

      const result = await client.verify.v2.services(serviceSid).verificationChecks.create({ to: phone, code: input.code });
      return NextResponse.json({
        ok: result.status === 'approved',
        message: result.status === 'approved' ? 'Código aprovado. O validador está funcionando.' : `Código não aprovado (status: ${result.status}).`,
      });
    } catch (error) {
      const info = twilioError(error);
      // The hint is only a guess; the original Twilio code and text always follow it, so the
      // real cause is visible even when the hint does not fit.
      const hint = hintFor(info.code);
      return NextResponse.json(
        {
          ok: false,
          message: `${hint ? `${hint} ` : ''}Twilio: ${info.message} (código ${info.code ?? '?'}, HTTP ${info.status ?? '?'}).`,
          twilioCode: info.code,
        },
        { status: 200 },
      );
    }
  }

  const checks: Check[] = [];

  checks.push(
    isPhoneVerificationEnabled()
      ? { id: 'flag', label: 'Verificação ativada', status: 'ok', detail: 'PHONE_VERIFICATION_ENABLED=true: o servidor exige o telefone confirmado.' }
      : { id: 'flag', label: 'Verificação ativada', status: 'warn', detail: 'PHONE_VERIFICATION_ENABLED não está "true": o cadastro NÃO exige a verificação.' },
  );
  checks.push(
    process.env.NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED === 'true'
      ? { id: 'flag-public', label: 'Bloqueio na tela', status: 'ok', detail: 'NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED=true: a tela de confirmação aparece (precisa de deploy novo para mudar).' }
      : { id: 'flag-public', label: 'Bloqueio na tela', status: 'warn', detail: 'NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED não está "true": a tela de confirmação não aparece.' },
  );
  checks.push(
    process.env.NEXTAUTH_SECRET
      ? { id: 'secret', label: 'NEXTAUTH_SECRET', status: 'ok', detail: 'Definido.' }
      : { id: 'secret', label: 'NEXTAUTH_SECRET', status: 'error', detail: 'Ausente: a verificação fica desativada.' },
  );
  checks.push(
    accountSid?.startsWith('AC')
      ? { id: 'account-sid', label: 'Account SID', status: 'ok', detail: tail(accountSid) ?? '' }
      : { id: 'account-sid', label: 'Account SID', status: 'error', detail: 'TWILIO_ACCOUNT_SID ausente ou fora do formato AC…' },
  );
  checks.push(
    authToken
      ? { id: 'auth-token', label: 'Auth Token', status: 'ok', detail: 'Definido.' }
      : { id: 'auth-token', label: 'Auth Token', status: 'error', detail: 'TWILIO_AUTH_TOKEN ausente.' },
  );
  checks.push(
    serviceSid?.startsWith('VA')
      ? { id: 'service-sid', label: 'Verify Service SID', status: 'ok', detail: tail(serviceSid) ?? '' }
      : { id: 'service-sid', label: 'Verify Service SID', status: 'error', detail: 'TWILIO_VERIFY_SERVICE_SID ausente ou fora do formato VA… (sem ele o app tenta enviar de um número próprio, que não existe).' },
  );
  if (process.env.TWILIO_FROM_NUMBER?.trim() && serviceSid) {
    checks.push({ id: 'from', label: 'TWILIO_FROM_NUMBER', status: 'warn', detail: 'Definido, mas ignorado porque o Verify Service está configurado. Pode ser removido.' });
  }

  if (accountSid && authToken) {
    const client = twilio(accountSid, authToken);
    try {
      const account = await client.api.v2010.accounts(accountSid).fetch();
      checks.push({
        id: 'account',
        label: 'Conta Twilio',
        status: account.status !== 'active' ? 'error' : account.type === 'Trial' ? 'warn' : 'ok',
        detail:
          account.status !== 'active'
            ? `Conta ${account.status}.`
            : account.type === 'Trial'
              ? 'Ativa, mas Trial: só envia para números verificados no console. Faça o upgrade para usuários reais.'
              : `Ativa (${account.type}).`,
      });
    } catch (error) {
      const info = twilioError(error);
      checks.push({ id: 'account', label: 'Conta Twilio', status: 'error', detail: hintFor(info.code) ?? `${info.message} (código ${info.code ?? '?'})` });
    }

    if (serviceSid) {
      try {
        const service = await client.verify.v2.services(serviceSid).fetch();
        checks.push({ id: 'service', label: 'Verify Service', status: 'ok', detail: `"${service.friendlyName}" encontrado, códigos de ${service.codeLength} dígitos.` });
      } catch (error) {
        const info = twilioError(error);
        checks.push({ id: 'service', label: 'Verify Service', status: 'error', detail: hintFor(info.code) ?? `${info.message} (código ${info.code ?? '?'})` });
      }
    }
  }

  checks.push({
    id: 'countries',
    label: 'Países aceitos',
    status: 'ok',
    detail: `${getAllowedPhoneCountries().length} países (EUA, Canadá e Europa por padrão). Habilite os mesmos em Twilio › Geo permissions.`,
  });

  return NextResponse.json({ checkedAt: new Date().toISOString(), ok: checks.every((check) => check.status !== 'error'), checks });
}
