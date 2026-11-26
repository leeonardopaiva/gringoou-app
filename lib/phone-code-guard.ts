import { NextResponse } from 'next/server';
import { assessPhoneRisk, getPhoneRiskConfig } from '@/lib/phone-risk';
import { getAccessCountry, getPhoneCountry, isBypassNumber } from '@/lib/phone-verification';
import { buildRateLimitHeaders, consumeRateLimit, getRequestIp } from '@/lib/rate-limit';

/**
 * Proteção compartilhada de TODO pedido de código por SMS (conta logada ou cadastro novo):
 * limites de taxa em camadas e análise de risco do número. Devolve a resposta de recusa, ou null se
 * o envio pode seguir. Ver lib/phone-risk.ts para a explicação das camadas.
 */
export async function guardPhoneCodeRequest({
  request,
  phoneE164,
  identity,
  perIdentityHourly = 5,
}: {
  request: Request;
  phoneE164: string;
  /** Quem pede: id da conta, ou o IP quando ainda não existe conta. */
  identity: string;
  perIdentityHourly?: number;
}): Promise<NextResponse | null> {
  const risk = getPhoneRiskConfig();
  const hour = 60 * 60 * 1000;
  const phoneCountry = getPhoneCountry(phoneE164) ?? 'XX';
  const ip = getRequestIp(request);

  // Checked one at a time so a request refused by a specific limit does not consume the broader counters.
  const limits: Array<{ message: string; run: () => ReturnType<typeof consumeRateLimit> }> = [
    {
      message: 'Aguarde um pouco antes de pedir outro código.',
      run: () => consumeRateLimit({ scope: 'phone:verify-start:cooldown', key: identity, max: 1, windowMs: risk.resendCooldownSeconds * 1000 }),
    },
    {
      message: 'Muitos códigos solicitados. Tente novamente mais tarde.',
      run: () => consumeRateLimit({ scope: 'phone:verify-start:user', key: identity, max: perIdentityHourly, windowMs: hour }),
    },
    {
      message: 'Muitos códigos solicitados hoje. Tente novamente amanhã.',
      run: () => consumeRateLimit({ scope: 'phone:verify-start:user-day', key: identity, max: risk.userDailyCap, windowMs: 24 * hour }),
    },
    {
      message: 'Muitos códigos solicitados desta rede. Tente novamente mais tarde.',
      run: () => consumeRateLimit({ scope: 'phone:verify-start:ip', key: ip, max: risk.ipHourlyCap, windowMs: hour }),
    },
    {
      message: 'Muitos códigos enviados para este número. Tente novamente mais tarde.',
      run: () => consumeRateLimit({ scope: 'phone:verify-start:number', key: phoneE164, max: 3, windowMs: hour }),
    },
    {
      message: 'Estamos com muitos pedidos de código agora. Tente novamente em alguns minutos.',
      run: () => consumeRateLimit({ scope: 'phone:verify-start:country', key: phoneCountry, max: risk.countryHourlyCap, windowMs: hour }),
    },
    {
      message: 'Estamos com muitos pedidos de código agora. Tente novamente em alguns minutos.',
      run: () => consumeRateLimit({ scope: 'phone:verify-start:global', key: 'all', max: risk.globalHourlyCap, windowMs: hour }),
    },
  ];

  for (const limit of limits) {
    const result = await limit.run();
    if (!result.allowed) {
      const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
      console.warn('[phone-verification] pedido de código barrado por limite de taxa', { phoneCountry, ip });
      return NextResponse.json(
        { error: limit.message, retryAfterSeconds: retryAfter },
        { status: 429, headers: { ...buildRateLimitHeaders(result), 'Retry-After': String(retryAfter) } },
      );
    }
  }

  // Signal for the admin logs: the number's country differs from where the request came from.
  const accessCountry = getAccessCountry(request);
  if (accessCountry && phoneCountry !== 'XX' && accessCountry !== phoneCountry) {
    console.info('[phone-verification] país do número difere do país de acesso', { phoneCountry, accessCountry });
  }

  // Paid lookup, only after every limit passed: blocks VoIP/virtual numbers and numbers with high
  // SMS-pumping risk. If Twilio's lookup is unavailable the request goes on (limits still apply).
  if (!isBypassNumber(phoneE164)) {
    const assessment = await assessPhoneRisk(phoneE164);
    if (!assessment.allowed) {
      console.warn('[phone-verification] número recusado pela análise de risco', { reason: assessment.reason, phoneCountry });
      return NextResponse.json({ error: assessment.message }, { status: 400 });
    }
  }

  return null;
}

/** Converte um erro do Twilio ao enviar o código na resposta certa para a pessoa. */
export function phoneSendErrorResponse(error: unknown): NextResponse {
  const twilioCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;

  // Verify 60203: too many sends to this number.
  if (twilioCode === 60203) {
    return NextResponse.json({ error: 'Muitos códigos enviados para este número. Tente novamente mais tarde.' }, { status: 429 });
  }

  // 21211: invalid number. 21614: not a mobile number. Verify: 60200 invalid number, 60205 landline/no SMS.
  if (twilioCode === 21211 || twilioCode === 21614 || twilioCode === 60200 || twilioCode === 60205) {
    return NextResponse.json({ error: 'Não foi possível enviar SMS para este número. Confira o telefone.' }, { status: 400 });
  }

  // 21608: the Twilio account has no approved Primary Compliance Profile (or is a trial) and may only
  // message verified caller IDs. A configuration issue, so it is logged too.
  if (twilioCode === 21608) {
    console.error('[phone-verification] Twilio 21608: conta sem Primary Compliance Profile aprovado');
    return NextResponse.json({ error: 'Não conseguimos enviar SMS para este número no momento. Tente novamente mais tarde.' }, { status: 400 });
  }

  // 60410: blocked by Twilio's fraud guard. 60605 / 21408: country not enabled in the Twilio geo permissions.
  if (twilioCode === 60410 || twilioCode === 60605 || twilioCode === 21408) {
    return NextResponse.json({ error: 'Não conseguimos enviar SMS para este número. Tente outro telefone.' }, { status: 400 });
  }

  // Everything else is an account/configuration problem (bad credentials 20003, Verify service not
  // found 20404, sender not owned 21606/21212, ...). Log all the details so the Vercel logs show the
  // real cause without exposing it to the user.
  const details = error as { status?: number; code?: number; message?: string; moreInfo?: string };
  console.error('[phone-verification] falha ao enviar código', {
    twilioCode,
    httpStatus: details?.status,
    message: details?.message ?? String(error),
    moreInfo: details?.moreInfo,
    usingVerifyService: Boolean(process.env.TWILIO_VERIFY_SERVICE_SID?.trim()),
  });
  return NextResponse.json({ error: 'Não foi possível enviar o código agora. Tente novamente.' }, { status: 502 });
}
