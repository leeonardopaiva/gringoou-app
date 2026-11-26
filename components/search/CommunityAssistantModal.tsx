'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUp, BriefcaseBusiness, CalendarDays, Check, ChevronRight, ExternalLink, Home, LoaderCircle, MapPin, Mic, PencilLine, RotateCcw, Share2, Sparkles, ThumbsDown, ThumbsUp, Users, Utensils, X } from 'lucide-react';
import { buildSearchPath } from '@/lib/search-navigation';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { getUserErrorMessage } from '@/lib/user-error';
import { useLanguage } from '@/components/i18n/LanguageProvider';

type AssistantReference = { id: string; label: string; href: string; type: string };
type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  references?: AssistantReference[];
  suggestions?: string[];
  error?: boolean;
  /** O Gringo ainda está escrevendo esta resposta (texto chegando em tempo real). */
  streaming?: boolean;
};

type SearchPayload = {
  businesses?: Array<{ id: string; slug: string; name: string; category: string; description?: string | null; locationLabel: string; ratingAverage?: number; ratingCount?: number }>;
  events?: Array<{ id: string; slug: string; title: string; description: string; locationLabel: string; startsAt: string; endsAt?: string | null }>;
  posts?: Array<{ id: string; content: string; locationLabel: string; author: { name?: string | null } }>;
  groups?: Array<{ id: string; slug: string; name: string; description?: string | null; category?: string | null; countryCode: string; region?: { label: string } | null }>;
  jobs?: Array<{ id: string; title: string; company: string; employmentType: string; salary?: string | null; locationLabel: string }>;
  housing?: Array<{ id: string; title: string; description: string; propertyType: string; price: string; locationLabel: string }>;
  people?: Array<{ id: string; name?: string | null; username?: string | null; locationLabel?: string | null; interests: string[] }>;
};

const suggestions = [
  { title: 'Restaurantes brasileiros perto de mim', category: 'Sabores locais', icon: <Utensils size={18} /> },
  { title: 'Profissionais recomendados pela comunidade', category: 'Serviços', icon: <Users size={18} /> },
  { title: 'Eventos para este fim de semana', category: 'Agenda local', icon: <CalendarDays size={18} /> },
  { title: 'Vagas de emprego publicadas essa semana', category: 'Trabalho', icon: <BriefcaseBusiness size={18} /> },
  { title: 'Moradias disponíveis na sua região', category: 'Moradia', icon: <Home size={18} /> },
];
const VISIBLE_SUGGESTIONS_COUNT = 3;

const loadingSteps = [
  'Entendendo sua pergunta',
  'Buscando em negócios, eventos e publicações',
  'Cruzando recomendações da comunidade',
  'Organizando a resposta',
];

const looksLikeFollowUp = (query: string) =>
  query.length < 150 && /^(mostre|quais|qual|onde|como|compare|detalhe|pode|conte|o que|e |e as|e os|existem|tem |há |perto|mais |outras|outros|dessas|desses)/i.test(query.trim());

const buildContext = (results: SearchPayload) => [
  ...(results.businesses || []).slice(0, 5).map((item) => ({ id: `business:${item.id}`, type: 'business', title: item.name, description: `${item.description || item.category}${item.ratingCount ? ` · avaliação ${item.ratingAverage?.toFixed(1)}/5 (${item.ratingCount})` : ''}`, location: item.locationLabel, href: `/businesses/${item.slug}` })),
  ...(results.events || []).slice(0, 5).map((item) => ({ id: `event:${item.id}`, type: 'event', title: item.title, description: `${item.description} · início ${item.startsAt}${item.endsAt ? ` · fim ${item.endsAt}` : ''}`, location: item.locationLabel, href: `/events/${item.slug}` })),
  ...(results.jobs || []).slice(0, 4).map((item) => ({ id: `job:${item.id}`, type: 'job', title: item.title, description: `${item.company} · ${item.employmentType}${item.salary ? ` · ${item.salary}` : ''}`, location: item.locationLabel, href: `/jobs/${item.id}` })),
  ...(results.groups || []).slice(0, 4).map((item) => ({ id: `group:${item.id}`, type: 'group', title: item.name, description: item.description || item.category || 'Grupo da comunidade', location: item.region?.label || item.countryCode, href: `/groups/${item.slug}` })),
  ...(results.posts || []).slice(0, 4).map((item) => ({ id: `post:${item.id}`, type: 'post', title: item.author.name || 'Publicação da comunidade', description: item.content, location: item.locationLabel, href: `/community?post=${item.id}` })),
  ...(results.housing || []).slice(0, 4).map((item) => ({ id: `housing:${item.id}`, type: 'housing', title: item.title, description: `${item.propertyType} · ${item.price} · ${item.description}`, location: item.locationLabel, href: `/housing/${item.id}` })),
  ...(results.people || []).slice(0, 4).map((item) => ({ id: `person:${item.id}`, type: 'person', title: item.name || `@${item.username || 'perfil'}`, description: `@${item.username || 'perfil'}${item.interests.length ? ` · interesses: ${item.interests.join(', ')}` : ''}`, location: item.locationLabel || '', href: item.username ? `/${item.username}` : '/community' })),
].slice(0, 30).map((item) => ({
  ...item,
  id: item.id.slice(0, 100),
  title: item.title.slice(0, 160),
  description: item.description.slice(0, 320),
  location: item.location.slice(0, 120),
  href: item.href.slice(0, 300),
}));

type CommunityAssistantModalProps = {
  open: boolean;
  initialQuery?: string;
  autoSubmitRequest?: { id: string; query: string } | null;
  regionLabel: string;
  onClose: () => void;
};

export default function CommunityAssistantModal({ open, initialQuery = '', autoSubmitRequest, regionLabel, onClose }: CommunityAssistantModalProps) {
  const { tx, language } = useLanguage();
  const router = useRouter();
  const [draft, setDraft] = useState(initialQuery);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSearchPath, setLastSearchPath] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState<AssistantReference[]>([]);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const handledAutoSubmitRef = useRef<string | null>(null);
  const { supported: voiceSupported, listening: voiceListening, toggle: toggleVoice } = useVoiceRecognition({
    onResult: (transcript) => void ask(transcript),
    onError: (message) => setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: message, error: true }]),
  });

  useEffect(() => {
    if (!open) return;
    setDraft(initialQuery);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [initialQuery, open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [loading, messages]);

  useEffect(() => {
    if (!loading) {
      setLoadingStepIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoadingStepIndex((current) => (current + 1) % loadingSteps.length);
    }, 1200);

    return () => window.clearInterval(intervalId);
  }, [loading]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  const ask = async (question: string, options?: { resetConversation?: boolean }) => {
    const query = question.trim();
    if (!query || loading) return;
    const resetConversation = Boolean(options?.resetConversation);
    const previousUserQuery = resetConversation
      ? undefined
      : [...messages].reverse().find((message) => message.role === 'user')?.text;
    const retrievalQuery = previousUserQuery && looksLikeFollowUp(query)
      ? `${previousUserQuery}. Pergunta complementar: ${query}`.slice(0, 300)
      : query;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: query };
    setMessages((current) => resetConversation ? [userMessage] : [...current, userMessage]);
    if (resetConversation) {
      setLastSearchPath(null);
      setFeedback({});
    }
    setDraft('');
    setLoading(true);
    setLoadingPreview([]);

    try {
      let filters: Record<string, string> = { q: retrievalQuery, category: 'all', city: '', country: '', businessType: '' };
      const interpretationResponse = await fetch('/api/search/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: retrievalQuery }),
      });
      const interpretation = await interpretationResponse.json().catch(() => null);
      if (interpretationResponse.ok && interpretation?.filters) filters = interpretation.filters;

      const resolvedSearchQuery = typeof filters.q === 'string' ? filters.q : retrievalQuery;
      const params = new URLSearchParams({ q: resolvedSearchQuery, pageSize: '8' });
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'q' && !(key === 'category' && value === 'all')) params.set(key, value);
      });
      const searchPath = buildSearchPath(resolvedSearchQuery, params);
      setLastSearchPath(searchPath);

      const searchResponse = await fetch(`/api/search?${params.toString()}`, { cache: 'no-store' });
      const searchPayload = await searchResponse.json().catch(() => null);
      if (!searchResponse.ok || !searchPayload) throw new Error(searchPayload?.error || 'Não foi possível consultar a comunidade.');
      const context = buildContext(searchPayload);
      setLoadingPreview(context.slice(0, 5).map((item) => ({
        id: item.id,
        label: item.title,
        href: item.href,
        type: item.type,
      })));

      const assistantResponse = await fetch('/api/search/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          context,
          language,
          stream: true,
          history: resetConversation ? [] : messages.slice(-6).map(({ role, text }) => ({ role, text: text.trim().slice(0, 600) })),
        }),
      });

      // Resposta em tempo real: o texto do Gringo aparece enquanto é escrito (uma linha JSON por evento).
      if (assistantResponse.ok && assistantResponse.body && (assistantResponse.headers.get('content-type') ?? '').includes('ndjson')) {
        const assistantId = crypto.randomUUID();
        const reader = assistantResponse.body.getReader();
        const decoder = new TextDecoder();
        let pending = '';
        let started = false;
        let finalEvent: { answer?: string; references?: AssistantReference[]; followUps?: string[] } | null = null;

        const handleEvent = (event: { type?: string; text?: string; answer?: string; references?: AssistantReference[]; followUps?: string[] }) => {
          if (event.type === 'delta' && event.text) {
            if (!started) {
              started = true;
              setLoadingPreview([]);
              setMessages((current) => [...current, { id: assistantId, role: 'assistant', text: event.text ?? '', streaming: true }]);
            } else {
              setMessages((current) => current.map((message) => (message.id === assistantId ? { ...message, text: message.text + (event.text ?? '') } : message)));
            }
          } else if (event.type === 'done') {
            finalEvent = event;
          }
        };

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          const lines = pending.split('\n');
          pending = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) continue;
            try { handleEvent(JSON.parse(line)); } catch { /* linha incompleta ou inválida: ignora */ }
          }
        }
        if (pending.trim()) {
          try { handleEvent(JSON.parse(pending)); } catch { /* ignora */ }
        }

        const result = finalEvent as { answer?: string; references?: AssistantReference[]; followUps?: string[] } | null;
        if (!result?.answer) throw new Error('Não foi possível gerar a resposta.');
        const finished: ChatMessage = { id: assistantId, role: 'assistant', text: result.answer, references: result.references || [], suggestions: result.followUps || [] };
        setMessages((current) => (started ? current.map((message) => (message.id === assistantId ? finished : message)) : [...current, finished]));
      } else {
        const assistantPayload = await assistantResponse.json().catch(() => null);
        if (!assistantResponse.ok || !assistantPayload?.answer) throw new Error(assistantPayload?.error || 'Não foi possível gerar a resposta.');

        setMessages((current) => [...current, {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: assistantPayload.answer,
          references: assistantPayload.references || [],
          suggestions: assistantPayload.followUps || [],
        }]);
      }
    } catch (error) {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: getUserErrorMessage(error, 'Não foi possível responder agora. Tente novamente.'),
        error: true,
      }]);
    } finally {
      setLoading(false);
      setLoadingPreview([]);
    }
  };

  useEffect(() => {
    if (!open || !autoSubmitRequest || handledAutoSubmitRef.current === autoSubmitRequest.id) return;
    handledAutoSubmitRef.current = autoSubmitRequest.id;
    void ask(autoSubmitRequest.query, { resetConversation: true });
  }, [autoSubmitRequest, open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(draft);
  };

  const startNewQuestion = () => {
    setMessages([]);
    setDraft('');
    setLastSearchPath(null);
    setFeedback({});
  };

  const shareAnswer = async (message: ChatMessage) => {
    const shareData = { title: 'Resposta do Gringoou', text: message.text };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(message.text);
        setCopiedMessageId(message.id);
        window.setTimeout(() => setCopiedMessageId(null), 1800);
      }
    } catch {
      // O usuário pode cancelar o compartilhamento sem afetar a conversa.
    }
  };

  if (!open) return null;
  const latestAssistantSuggestions = [...messages].reverse()
    .find((message) => message.role === 'assistant' && !message.error)?.suggestions || [];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-surface text-slate-900" role="dialog" aria-modal="true" aria-label={tx('Assistente da comunidade')}>
      <header className="border-b border-slate-100 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-3xl items-center gap-3 px-4 py-2 sm:px-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm"><Sparkles size={20} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-slate-900">{tx('Fale com o Gringo')}</h2>
            <p className="flex items-center gap-1 truncate text-xs text-slate-500"><MapPin size={12} /> {tx('Respostas da comunidade em')} {regionLabel}</p>
          </div>
          {messages.length ? <button type="button" onClick={startNewQuestion} className="hidden h-9 items-center gap-2 rounded-full bg-slate-100 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-200 sm:inline-flex"><PencilLine size={14} /> {tx('Nova pergunta')}</button> : null}
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200" aria-label={tx('Fechar assistente')}><X size={20} /></button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 pb-40 pt-7 sm:px-6 sm:pt-12">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col justify-center py-6 sm:py-12">
              <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
                <span aria-hidden className="absolute inset-0 rounded-full bg-brand-50" />
                <span aria-hidden className="absolute inset-5 rounded-full bg-brand-100" />
                <span aria-hidden className="absolute left-2 top-3 h-1.5 w-1.5 rounded-full bg-brand-200" />
                <span aria-hidden className="absolute right-2 top-8 h-1.5 w-1.5 rounded-full bg-brand-200" />
                <span aria-hidden className="absolute bottom-3 left-5 h-1.5 w-1.5 rounded-full bg-brand-200" />
                <span aria-hidden className="absolute bottom-5 right-3 h-1.5 w-1.5 rounded-full bg-brand-200" />
                <Sparkles size={36} className="relative text-brand-500" />
              </div>
              <h3 className="mx-auto mt-6 max-w-sm text-center text-2xl font-extrabold leading-8 text-slate-900 sm:text-[28px]">
                {tx('Descubra recomendações e informações da sua região.')}
              </h3>
              <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-slate-500">
                {tx('Pesquise negócios, vagas, moradias, eventos e publicações reais da comunidade.')}
              </p>

              <div className="mt-9">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">{tx('Sugestões para começar')}</p>
                  {!showAllSuggestions && suggestions.length > VISIBLE_SUGGESTIONS_COUNT ? (
                    <button
                      type="button"
                      onClick={() => setShowAllSuggestions(true)}
                      className="flex items-center gap-0.5 text-xs font-bold text-brand-600 transition hover:text-brand-700"
                    >
                      {tx('Ver mais')} <ChevronRight size={14} />
                    </button>
                  ) : null}
                </div>
                <div className="divide-y divide-slate-100">
                  {(showAllSuggestions ? suggestions : suggestions.slice(0, VISIBLE_SUGGESTIONS_COUNT)).map((suggestion) => (
                    <button
                      key={suggestion.title}
                      type="button"
                      onClick={() => void ask(suggestion.title)}
                      className="group flex w-full items-center gap-3 py-3 text-left transition hover:bg-slate-50"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                        {suggestion.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold leading-5 text-slate-800 group-hover:text-brand-700">{suggestion.title}</span>
                        <span className="mt-1 inline-block text-xs font-semibold text-slate-400">{suggestion.category}</span>
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-brand-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-7">
              {messages.map((message) => (
                <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'block'}>
                  {message.role === 'user' ? (
                    <div className="max-w-[88%] rounded-3xl rounded-br-md bg-brand-strong-hover px-5 py-3 text-sm font-semibold leading-6 text-white shadow-sm">{message.text}</div>
                  ) : (
                    <div className={message.error ? 'rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700' : ''}>
                      {!message.error ? <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-500"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white"><Sparkles size={14} /></span> {tx('Gringo')}</div> : null}
                      <p className="whitespace-pre-line text-sm leading-6 text-slate-800 sm:text-[15px]">{message.text}{message.streaming ? <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-brand-500 align-middle" /> : null}</p>
                      {message.references?.length ? <div className="mt-5 grid gap-2 sm:grid-cols-2">{message.references.map((reference) => <Link key={reference.id} href={reference.href} onClick={onClose} className="group flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-surface px-4 py-3 shadow-sm transition hover:border-brand-200 hover:bg-brand-50"><span className="truncate text-xs font-bold text-slate-700 group-hover:text-brand-700">{tx(reference.label)}</span><ExternalLink size={14} className="shrink-0 text-brand-500" /></Link>)}</div> : null}
                      {!message.error ? <div className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3"><button type="button" onClick={() => setFeedback((current) => ({ ...current, [message.id]: 'up' }))} className={`flex h-9 w-9 items-center justify-center rounded-full transition ${feedback[message.id] === 'up' ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:bg-slate-100'}`} aria-label={tx('Resposta útil')}><ThumbsUp size={16} /></button><button type="button" onClick={() => setFeedback((current) => ({ ...current, [message.id]: 'down' }))} className={`flex h-9 w-9 items-center justify-center rounded-full transition ${feedback[message.id] === 'down' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`} aria-label={tx('Resposta não foi útil')}><ThumbsDown size={16} /></button><button type="button" onClick={() => void shareAnswer(message)} className="flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100" aria-label={tx('Compartilhar resposta')}>{copiedMessageId === message.id ? <Check size={16} /> : <Share2 size={16} />}{copiedMessageId === message.id ? tx('Copiado') : ''}</button></div> : null}
                    </div>
                  )}
                </div>
              ))}
              {!loading && messages.at(-1)?.role === 'assistant' && !messages.at(-1)?.error && latestAssistantSuggestions.length ? <section><p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-800">{tx('Continue explorando')} <Sparkles size={14} className="text-brand-500" /></p><div className="flex flex-wrap gap-2">{latestAssistantSuggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => void ask(suggestion)} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-left text-xs font-bold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700">{suggestion}</button>)}</div></section> : null}
              {loading && !messages.at(-1)?.streaming ? (
                <div className="space-y-4 rounded-[26px] border border-brand-100 bg-brand-50/70 px-4 py-4 text-sm text-slate-700 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white">
                      <LoaderCircle size={18} className="animate-spin" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-900">{loadingSteps[loadingStepIndex]}</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">{tx('Resumo gerado a partir do que a comunidade já publicou.')}</p>
                    </div>
                  </div>
                  {loadingPreview.length ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{tx('Encontrado na comunidade')}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {loadingPreview.map((reference) => (
                          <Link key={reference.id} href={reference.href} onClick={onClose} className="flex min-w-0 items-center justify-between gap-2 rounded-2xl bg-surface px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:text-brand-700">
                            <span className="truncate">{tx(reference.label)}</span>
                            <ExternalLink size={13} className="shrink-0 text-brand-500" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <span key={index} className="h-2 w-2 animate-pulse rounded-full bg-brand-300" style={{ animationDelay: `${index * 160}ms` }} />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              <div ref={endRef} />
            </div>
          )}
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-slate-100 bg-surface/95 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_35px_rgba(15,23,42,0.04)] backdrop-blur">
        <div className="mx-auto w-full max-w-2xl">
          {messages.length ? <button type="button" onClick={startNewQuestion} className="mb-2 inline-flex h-8 items-center gap-1.5 text-xs font-bold text-brand-600 sm:hidden"><RotateCcw size={14} /> {tx('Nova pergunta')}</button> : null}
          <form onSubmit={submit} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 p-1.5 pl-5 shadow-inner focus-within:border-brand-300 focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand-100">
            <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={voiceListening ? tx('Ouvindo... fale agora') : messages.length ? tx('Faça outra pergunta...') : tx('Pergunte sobre sua comunidade')} maxLength={300} className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400" />
            {voiceSupported ? (
              <button
                type="button"
                onClick={toggleVoice}
                disabled={loading}
                aria-label={voiceListening ? tx('Parar pesquisa por voz') : tx('Perguntar por voz')}
                title={voiceListening ? tx('Ouvindo...') : tx('Perguntar por voz')}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${voiceListening ? 'animate-pulse bg-red-50 text-red-500' : 'text-slate-500 hover:bg-surface hover:text-brand-500'}`}
              >
                <Mic size={17} aria-hidden="true" />
              </button>
            ) : null}
            <button type="submit" disabled={!draft.trim() || loading} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition hover:brightness-105 disabled:opacity-40" aria-label={tx('Enviar pergunta')}><ArrowUp size={20} /></button>
          </form>
          <div className="mt-2 flex items-center justify-between px-3 text-[11px] text-slate-400">
            <span>{tx('Resposta por IA baseada em conteúdo público da comunidade.')}</span>
            {lastSearchPath ? <button type="button" onClick={() => { onClose(); router.push(lastSearchPath); }} className="font-bold text-brand-600">{tx('Ver resultados')}</button> : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
