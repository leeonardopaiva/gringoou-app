import twilio from 'twilio';

/**
 * Proteção contra fraude na verificação por telefone (servidor).
 *
 * Camadas, da mais barata para a mais cara (cada uma só roda se as anteriores passarem):
 *  1. regras locais: formato, país permitido, telefone já ligado a outra conta;
 *  2. limites de taxa: por conta, IP, número, intervalo entre reenvios, teto por hora (global e por país);
 *  3. consulta de risco do número no Twilio Lookup (tipo de linha e risco de SMS pumping);
 *  4. envio do código com o IP do dispositivo (o antifraude do Twilio Verify usa esse dado).
 *
 * Tudo ajustável por variáveis de ambiente (ver .env.example, seção "Verificação por telefone").
 */

const intFromEnv = (name: string, fallback: number) => {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getPhoneRiskConfig = () => ({
  /** Teto de códigos enviados por hora no app inteiro (corta ataques de SMS pumping). */
  globalHourlyCap: intFromEnv('PHONE_SMS_HOURLY_CAP', 300),
  /** Teto de códigos por hora para números de um mesmo país. */
  countryHourlyCap: intFromEnv('PHONE_SMS_COUNTRY_HOURLY_CAP', 120),
  /** Códigos por hora por IP (várias contas na mesma rede ainda cabem). */
  ipHourlyCap: intFromEnv('PHONE_SMS_IP_HOURLY_CAP', 15),
  /** Códigos por dia por conta. */
  userDailyCap: intFromEnv('PHONE_SMS_USER_DAILY_CAP', 10),
  /** Segundos mínimos entre dois envios da mesma conta. */
  resendCooldownSeconds: intFromEnv('PHONE_SMS_RESEND_COOLDOWN_SECONDS', 45),
  /** Pontuação (0-100) do risco de SMS pumping a partir da qual o número é recusado. */
  riskScoreBlock: intFromEnv('PHONE_RISK_SCORE_BLOCK', 75),
});

// Linhas que não recebem SMS de um celular real ou que fraudadores usam para criar contas em série.
const VOIP_LINE_TYPES = new Set(['fixedvoip', 'nonfixedvoip', 'voip']);
const NON_MOBILE_LINE_TYPES = new Set(['landline', 'premium', 'tollfree', 'sharedcost', 'uan', 'voicemail', 'pager', 'personal']);

export type PhoneRiskSignals = {
  lineType?: string | null;
  riskScore?: number | null;
  numberBlocked?: boolean | null;
};

export type PhoneRiskDecision =
  | { allowed: true }
  | { allowed: false; reason: 'voip' | 'not_mobile' | 'risk_score' | 'number_blocked' | 'invalid'; message: string };

/** Decide se o número pode receber código, a partir dos sinais do Twilio. Função pura (testável). */
export function evaluatePhoneRisk(signals: PhoneRiskSignals, options: { blockVoip: boolean; riskScoreBlock: number }): PhoneRiskDecision {
  const lineType = signals.lineType?.toLowerCase().replace(/[\s_-]/g, '') ?? '';

  if (signals.numberBlocked) {
    return { allowed: false, reason: 'number_blocked', message: 'Não conseguimos enviar SMS para este número. Tente outro telefone.' };
  }

  if (options.blockVoip && VOIP_LINE_TYPES.has(lineType)) {
    return { allowed: false, reason: 'voip', message: 'Não aceitamos números de internet (como Google Voice). Use o número do seu celular.' };
  }

  if (NON_MOBILE_LINE_TYPES.has(lineType)) {
    return { allowed: false, reason: 'not_mobile', message: 'Use o número de um celular, que receba SMS.' };
  }

  if (typeof signals.riskScore === 'number' && signals.riskScore >= options.riskScoreBlock) {
    return { allowed: false, reason: 'risk_score', message: 'Não conseguimos enviar SMS para este número. Tente outro telefone.' };
  }

  return { allowed: true };
}

const isDevSmsMode = () => process.env.NODE_ENV !== 'production' && process.env.PHONE_SMS_DEV_MODE === 'true';

/**
 * A consulta de Lookup é paga (centavos por número), então só roda em produção, ou local se
 * PHONE_BLOCK_VOIP="true" for definido de propósito. PHONE_BLOCK_VOIP="false" desliga.
 */
export const isPhoneLookupEnabled = () => {
  if (isDevSmsMode()) return false;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return false;
  const flag = process.env.PHONE_BLOCK_VOIP?.trim().toLowerCase();
  if (flag === 'false') return false;
  return flag === 'true' || process.env.NODE_ENV === 'production';
};

const LOOKUP_TIMEOUT_MS = 4000;

type LookupInstance = {
  lineTypeIntelligence?: { type?: string | null } | null;
  smsPumpingRisk?: { smsPumpingRiskScore?: number | null; numberBlocked?: boolean | null } | null;
};

/**
 * Consulta o Twilio Lookup v2. Se a consulta falhar ou demorar, NÃO barra a pessoa (os limites de taxa
 * e o antifraude do Verify continuam valendo) e o problema é registrado para o administrador.
 */
export async function assessPhoneRisk(phoneE164: string): Promise<PhoneRiskDecision> {
  if (!isPhoneLookupEnabled()) return { allowed: true };

  const config = getPhoneRiskConfig();
  const blockVoip = process.env.PHONE_BLOCK_VOIP?.trim().toLowerCase() !== 'false';

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    const lookup = client.lookups.v2
      .phoneNumbers(phoneE164)
      .fetch({ fields: 'line_type_intelligence,sms_pumping_risk' }) as unknown as Promise<LookupInstance>;
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('LOOKUP_TIMEOUT')), LOOKUP_TIMEOUT_MS));
    const result = await Promise.race([lookup, timeout]);

    return evaluatePhoneRisk(
      {
        lineType: result.lineTypeIntelligence?.type ?? null,
        riskScore: result.smsPumpingRisk?.smsPumpingRiskScore ?? null,
        numberBlocked: result.smsPumpingRisk?.numberBlocked ?? null,
      },
      { blockVoip, riskScoreBlock: config.riskScoreBlock },
    );
  } catch (error) {
    const details = error as { code?: number; status?: number; message?: string };
    // 20404: o Lookup não reconhece o número (inexistente ou fora de uso).
    if (details?.code === 20404 || details?.status === 404) {
      return { allowed: false, reason: 'invalid', message: 'Número de telefone inválido. Confira o número e o código do país.' };
    }
    console.warn('[phone-risk] consulta de risco indisponível; seguindo só com os limites de taxa', {
      twilioCode: details?.code,
      httpStatus: details?.status,
      message: details?.message ?? String(error),
    });
    return { allowed: true };
  }
}
