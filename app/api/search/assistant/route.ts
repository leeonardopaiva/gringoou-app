import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';
import { buildRateLimitHeaders, consumeRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { isCommunityAiConfigured, streamCommunityAiText } from '@/lib/community-ai';
import { AnswerSplitter, META_MARKER, parseGringoMeta } from '@/lib/gringo/answer-stream';
import { GRINGO_PERSONA, buildLanguageInstruction, isGringoLanguage, type GringoLanguage } from '@/lib/gringo/persona';
import { pickGringoSkill } from '@/lib/gringo/skills';
import { isOperationalFeatureEnabled } from '@/lib/operational-flags';

const contextItemSchema = z.object({
  id: z.string().max(100),
  type: z.enum(['business', 'event', 'post', 'group', 'job', 'housing', 'person']),
  title: z.string().max(160),
  description: z.string().max(320).default(''),
  location: z.string().max(120).default(''),
  href: z.string().startsWith('/').max(300),
});

const requestSchema = z.object({
  query: z.string().trim().min(2).max(300),
  context: z.array(contextItemSchema).max(30),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().trim().max(600) })).max(6).default([]),
  language: z.enum(['pt-BR', 'pt-PT', 'en-US', 'es']).default('pt-BR'),
  stream: z.boolean().default(false),
});

const buildFallbackFollowUps = (query: string, context: z.infer<typeof contextItemSchema>[]) => {
  const first = context[0];
  const second = context[1];
  const byType: Record<string, string> = {
    business: 'Qual dessas opções tem a melhor avaliação?',
    event: 'Qual desses eventos acontece mais cedo?',
    job: 'Qual vaga parece mais compatível com o que procurei?',
    housing: 'Qual moradia oferece o melhor custo-benefício?',
    group: 'Qual grupo parece mais relacionado ao meu interesse?',
    post: 'Quais publicações trazem informações mais recentes?',
    person: 'Quais perfis têm interesses mais relacionados à minha busca?',
  };
  return Array.from(new Set([
    first ? `Pode me dar mais detalhes sobre ${first.title}?` : `Pode detalhar os resultados para ${query}?`,
    first && second ? `Compare ${first.title} com ${second.title}.` : first ? `O que diferencia ${first.title} das outras opções?` : '',
    first ? byType[first.type] : '',
  ].filter(Boolean))).slice(0, 3);
};

const normalizeRequestPayload = (value: unknown) => {
  const body = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const context = Array.isArray(body.context) ? body.context.slice(0, 30).map((entry) => {
    const item = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry as Record<string, unknown> : {};
    return {
      id: String(item.id || '').slice(0, 100),
      type: item.type,
      title: String(item.title || '').slice(0, 160),
      description: String(item.description || '').slice(0, 320),
      location: String(item.location || '').slice(0, 120),
      href: String(item.href || '').slice(0, 300),
    };
  }) : [];
  const history = Array.isArray(body.history) ? body.history.slice(-6).map((entry) => {
    const item = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry as Record<string, unknown> : {};
    return { role: item.role, text: String(item.text || '').trim().slice(0, 600) };
  }) : [];
  const language: GringoLanguage = isGringoLanguage(body.language) ? body.language : 'pt-BR';
  return { query: String(body.query || '').trim().slice(0, 300), context, history, language, stream: body.stream === true };
};

export async function POST(request: Request) {
  if (!isOperationalFeatureEnabled('aiAssistant')) {
    return NextResponse.json(
      { error: 'O assistente está temporariamente pausado.' },
      { status: 503, headers: { 'Retry-After': '300' } },
    );
  }

  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const rateLimit = await consumeRateLimit({
    scope: 'search:assistant',
    key: getRateLimitKey(request, session.user.id),
    max: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Limite do assistente atingido. Tente novamente mais tarde.' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const parsed = requestSchema.safeParse(normalizeRequestPayload(await request.json().catch(() => null)));
  if (!parsed.success) {
    console.warn('Invalid community assistant payload', parsed.error.flatten().fieldErrors);
    return NextResponse.json({ error: 'Não foi possível interpretar esta pergunta. Tente escrevê-la de outra forma.' }, { status: 400 });
  }

  if (!isCommunityAiConfigured()) return NextResponse.json({ error: 'O assistente ainda não está configurado.' }, { status: 503 });

  const { query, context, history, language, stream } = parsed.data;
  const skill = pickGringoSkill(query, context.map((item) => item.type));

  // Sem resultados reais, só as skills que não dependem deles (imigração, escrever, primeiros passos...)
  // conseguem ajudar; nas outras o Gringo avisa com honestidade e sugere o próximo passo.
  if (context.length === 0 && skill.needsResults) {
    return NextResponse.json({
      answer: 'Procurei aqui na comunidade e não achei nada público sobre isso ainda. Se você me contar o serviço e a cidade, eu tento de novo, ou vale perguntar num grupo da sua região.',
      references: [],
      followUps: [],
    });
  }

  const firstName = session.user.name?.trim().split(/\s+/)[0]?.slice(0, 40) || null;
  const system = [GRINGO_PERSONA, '', buildLanguageInstruction(language), '', skill.guidance].join('\n');
  const contents = [
    'Escreva a resposta direto, em texto corrido, no tom do Gringo. Não use JSON nem markdown na resposta.',
    'Depois do texto, em uma nova linha, escreva exatamente ' + META_MARKER + ' e, na linha seguinte, somente um JSON no formato {"referenceIds":["..."],"followUps":["...","...","..."]}.',
    'Em referenceIds, escolha até seis IDs dos resultados que realmente ajudam (pode ser vazio se nenhum servir).',
    'Em followUps, exatamente três perguntas curtas que a pessoa provavelmente faria a seguir, ligadas à conversa; nada genérico. Escreva-as no idioma da resposta.',
    'Primeiro nome da pessoa (dado, pode ser usado uma vez no máximo): ' + JSON.stringify(firstName),
    'Pergunta: ' + JSON.stringify(query),
    'Histórico recente: ' + JSON.stringify(history),
    'Resultados públicos da comunidade (podem estar vazios): ' + JSON.stringify(context),
  ].join('\n');

  const byId = new Map(context.map((item) => [item.id, item]));
  const toReference = ({ id, title, href, type }: z.infer<typeof contextItemSchema>) => ({ id, label: title, href, type });

  const finalize = (answerRaw: string, metaRaw: string) => {
    const answer = answerRaw.trim().slice(0, 1800);
    if (!answer) throw new Error('INVALID_AI_RESPONSE');
    const meta = parseGringoMeta(metaRaw);
    const generated = meta.followUps.map((value) => value.trim().slice(0, 140)).filter((value) => value.length >= 8);
    const followUps = Array.from(new Set([...generated, ...buildFallbackFollowUps(query, context)])).slice(0, 3);
    const picked = Array.from(new Set(meta.referenceIds)).map((id) => byId.get(id)).filter((item): item is z.infer<typeof contextItemSchema> => Boolean(item)).slice(0, 6);
    // Se o modelo não mandou o bloco de referências, mostra os primeiros resultados em vez de nada.
    const references = picked.length || metaRaw ? picked : context.slice(0, 3);
    return { answer, followUps, references: references.map(toReference) };
  };

  const degraded = () => ({
    answer: context.length
      ? 'Achei estas opções na comunidade: ' + context.slice(0, 3).map((item) => item.title + (item.location ? ' (' + item.location + ')' : '')).join(', ') + '. Minha resposta completa deu uma travada agora, mas você pode abrir as referências abaixo.'
      : 'Minha resposta deu uma travada agora e não achei resultados locais suficientes. Tenta de novo daqui a pouco?',
    references: context.slice(0, 6).map(toReference),
    followUps: buildFallbackFollowUps(query, context),
    degraded: true,
  });

  const modelStream = () => streamCommunityAiText({ system, contents, temperature: 0.6, maxTokens: 1000 });

  if (!stream) {
    try {
      const splitter = new AnswerSplitter();
      for await (const chunk of modelStream()) splitter.push(chunk);
      const { answer, meta } = splitter.finish();
      return NextResponse.json({ ...finalize(answer, meta), skill: skill.id });
    } catch (error) {
      console.error('Gringo assistant failed:', error);
      return NextResponse.json(degraded());
    }
  }

  // Resposta em tempo real: uma linha JSON por evento (delta com o texto, done com o resultado final).
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      try {
        send({ type: 'start', skill: skill.id });
        const splitter = new AnswerSplitter();
        for await (const chunk of modelStream()) {
          const visible = splitter.push(chunk);
          if (visible) send({ type: 'delta', text: visible });
        }
        const { tail: rest, answer, meta } = splitter.finish();
        if (rest) send({ type: 'delta', text: rest });
        send({ type: 'done', ...finalize(answer, meta), skill: skill.id });
      } catch (error) {
        console.error('Gringo assistant stream failed:', error);
        send({ type: 'done', ...degraded() });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no' },
  });
}
