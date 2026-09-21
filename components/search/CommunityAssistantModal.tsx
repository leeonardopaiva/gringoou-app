'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUp, ExternalLink, LoaderCircle, MapPin, Sparkles, X } from 'lucide-react';
import { buildSearchPath } from '@/lib/search-navigation';

type AssistantReference = { id: string; label: string; href: string; type: string };
type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  references?: AssistantReference[];
  error?: boolean;
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
  { title: 'Restaurantes brasileiros perto de mim', category: 'Sabores locais' },
  { title: 'Profissionais recomendados pela comunidade', category: 'Serviços' },
  { title: 'Eventos para este fim de semana', category: 'Agenda local' },
];

const buildContext = (results: SearchPayload) => [
  ...(results.businesses || []).slice(0, 5).map((item) => ({ id: `business:${item.id}`, type: 'business', title: item.name, description: `${item.description || item.category}${item.ratingCount ? ` · avaliação ${item.ratingAverage?.toFixed(1)}/5 (${item.ratingCount})` : ''}`, location: item.locationLabel, href: `/negocios/${item.slug}` })),
  ...(results.events || []).slice(0, 5).map((item) => ({ id: `event:${item.id}`, type: 'event', title: item.title, description: `${item.description} · início ${item.startsAt}${item.endsAt ? ` · fim ${item.endsAt}` : ''}`, location: item.locationLabel, href: `/eventos/${item.slug}` })),
  ...(results.jobs || []).slice(0, 4).map((item) => ({ id: `job:${item.id}`, type: 'job', title: item.title, description: `${item.company} · ${item.employmentType}${item.salary ? ` · ${item.salary}` : ''}`, location: item.locationLabel, href: `/vagas/${item.id}` })),
  ...(results.groups || []).slice(0, 4).map((item) => ({ id: `group:${item.id}`, type: 'group', title: item.name, description: item.description || item.category || 'Grupo da comunidade', location: item.region?.label || item.countryCode, href: `/grupos/${item.slug}` })),
  ...(results.posts || []).slice(0, 4).map((item) => ({ id: `post:${item.id}`, type: 'post', title: item.author.name || 'Publicação da comunidade', description: item.content, location: item.locationLabel, href: `/community?post=${item.id}` })),
  ...(results.housing || []).slice(0, 4).map((item) => ({ id: `housing:${item.id}`, type: 'housing', title: item.title, description: `${item.propertyType} · ${item.price} · ${item.description}`, location: item.locationLabel, href: `/moradia/${item.id}` })),
  ...(results.people || []).slice(0, 4).map((item) => ({ id: `person:${item.id}`, type: 'person', title: item.name || `@${item.username || 'perfil'}`, description: `@${item.username || 'perfil'}${item.interests.length ? ` · interesses: ${item.interests.join(', ')}` : ''}`, location: item.locationLabel || '', href: item.username ? `/${item.username}` : '/community' })),
].slice(0, 30).map((item) => ({ ...item, description: item.description.slice(0, 320) }));

type CommunityAssistantModalProps = {
  open: boolean;
  initialQuery?: string;
  regionLabel: string;
  onClose: () => void;
};

export default function CommunityAssistantModal({ open, initialQuery = '', regionLabel, onClose }: CommunityAssistantModalProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialQuery);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSearchPath, setLastSearchPath] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

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
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  const ask = async (question: string) => {
    const query = question.trim();
    if (!query || loading) return;

    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: query }]);
    setDraft('');
    setLoading(true);

    try {
      let filters: Record<string, string> = { q: query, category: 'all', city: '', country: '', businessType: '' };
      const interpretationResponse = await fetch('/api/search/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const interpretation = await interpretationResponse.json().catch(() => null);
      if (interpretationResponse.ok && interpretation?.filters) filters = interpretation.filters;

      const params = new URLSearchParams({ q: filters.q || query, pageSize: '8' });
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'q' && !(key === 'category' && value === 'all')) params.set(key, value);
      });
      const searchPath = buildSearchPath(filters.q || query, params);
      setLastSearchPath(searchPath);

      const searchResponse = await fetch(`/api/search?${params.toString()}`, { cache: 'no-store' });
      const searchPayload = await searchResponse.json().catch(() => null);
      if (!searchResponse.ok || !searchPayload) throw new Error(searchPayload?.error || 'Não foi possível consultar a comunidade.');

      const assistantResponse = await fetch('/api/search/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context: buildContext(searchPayload), history: messages.slice(-6).map(({ role, text }) => ({ role, text })) }),
      });
      const assistantPayload = await assistantResponse.json().catch(() => null);
      if (!assistantResponse.ok || !assistantPayload?.answer) throw new Error(assistantPayload?.error || 'Não foi possível gerar a resposta.');

      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: assistantPayload.answer,
        references: assistantPayload.references || [],
      }]);
    } catch (error) {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: error instanceof Error ? error.message : 'Não foi possível responder agora. Tente novamente.',
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(draft);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white text-slate-900" role="dialog" aria-modal="true" aria-label="Assistente da comunidade">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white"><Sparkles size={20} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-slate-900">Pergunte ao Gringoo!</h2>
            <p className="flex items-center gap-1 truncate text-xs text-slate-500"><MapPin size={12} /> Respostas da comunidade em {regionLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100" aria-label="Fechar assistente"><X size={22} /></button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 pb-36 pt-8 sm:px-6 sm:pt-14">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col">
              <div className="max-w-xl">
                <p className="text-xl font-bold leading-7 text-slate-900">Descubra recomendações e informações publicadas pela sua comunidade.</p>
                <p className="mt-2 text-lg text-slate-700">O que você está procurando? <Sparkles size={16} className="inline text-brand-500" /></p>
              </div>
              <div className="mt-auto grid gap-3 pt-12 sm:grid-cols-3">
                {suggestions.map((suggestion) => (
                  <button key={suggestion.title} type="button" onClick={() => void ask(suggestion.title)} className="flex min-h-32 flex-col justify-between rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-brand-50">
                    <span className="font-bold leading-5 text-slate-800">{suggestion.title}</span>
                    <span className="mt-6 text-xs text-slate-500">{suggestion.category}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((message) => (
                <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={message.role === 'user' ? 'max-w-[86%] rounded-3xl rounded-br-lg bg-brand-500 px-5 py-3 text-sm leading-6 text-white' : `max-w-[92%] rounded-3xl rounded-bl-lg border px-5 py-4 text-sm leading-6 ${message.error ? 'border-red-100 bg-red-50 text-red-700' : 'border-slate-100 bg-slate-50 text-slate-700'}`}>
                    <p className="whitespace-pre-line">{message.text}</p>
                    {message.references?.length ? <div className="mt-4 flex flex-wrap gap-2">{message.references.map((reference) => <Link key={reference.id} href={reference.href} onClick={onClose} className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-white px-3 py-1.5 text-xs font-bold text-brand-700"><ExternalLink size={12} />{reference.label}</Link>)}</div> : null}
                  </div>
                </div>
              ))}
              {loading ? <div className="flex justify-start"><div className="inline-flex items-center gap-2 rounded-3xl rounded-bl-lg bg-slate-50 px-5 py-4 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin text-brand-500" /> Consultando a comunidade...</div></div> : null}
              <div ref={endRef} />
            </div>
          )}
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-slate-100 bg-white/95 px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto w-full max-w-2xl">
          <form onSubmit={submit} className="flex items-center gap-2 rounded-full bg-slate-100 p-2 pl-5 focus-within:ring-2 focus-within:ring-brand-200">
            <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Pergunte sobre sua comunidade" maxLength={300} className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400" />
            <button type="submit" disabled={!draft.trim() || loading} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition hover:brightness-105 disabled:opacity-40" aria-label="Enviar pergunta"><ArrowUp size={20} /></button>
          </form>
          <div className="mt-2 flex items-center justify-between px-3 text-[11px] text-slate-400">
            <span>Resposta por IA baseada em conteúdo público.</span>
            {lastSearchPath ? <button type="button" onClick={() => { onClose(); router.push(lastSearchPath); }} className="font-bold text-brand-600">Ver resultados</button> : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
