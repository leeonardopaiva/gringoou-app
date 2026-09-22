'use client';

import React, { startTransition, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Briefcase, CalendarDays, Clock3, House, LockKeyhole, MapPin, Search, SlidersHorizontal, Sparkles, Store, UserRound, Users, UsersRound, X } from 'lucide-react';
import { ContentColumn } from '@/components/ui';
import RegionSelector from '@/components/RegionSelector';
import { useToast } from '@/components/feedback/ToastProvider';
import { buildSearchPath } from '@/lib/search-navigation';

type SearchCategory = 'all' | 'businesses' | 'events' | 'posts' | 'people' | 'groups' | 'jobs' | 'housing' | 'interests';
type Counts = Record<Exclude<SearchCategory, 'all'>, number> & { total: number };
type SearchResponse = {
  query: string;
  category: SearchCategory;
  businesses: Array<{ id: string; slug: string; name: string; category: string; address: string; description?: string | null; imageUrl?: string | null; locationLabel: string; ratingAverage: number; ratingCount: number }>;
  events: Array<{ id: string; slug: string; title: string; venueName: string; startsAt: string; endsAt?: string | null; locationLabel: string; description: string; imageUrl?: string | null }>;
  posts: Array<{ id: string; content: string; createdAt: string; locationLabel: string; authorHref?: string; authorType?: 'USER' | 'BUSINESS'; author: { name?: string | null; username?: string | null; image?: string | null }; _count: { comments: number; reactions: number } }>;
  people: Array<{ id: string; name?: string | null; username?: string | null; image?: string | null; locationLabel?: string | null; interests: string[] }>;
  groups: Array<{ id: string; name: string; slug: string; description?: string | null; imageUrl?: string | null; coverImageUrl?: string | null; category?: string | null; countryCode: string; isPublic: boolean; region?: { label: string } | null; _count: { members: number } }>;
  jobs: Array<{ id: string; title: string; company: string; employmentType: string; locationLabel: string; salary?: string | null; createdAt: string }>;
  housing: Array<{ id: string; title: string; description: string; propertyType: string; price: string; locationLabel: string; imageUrl?: string | null; createdAt: string }>;
  interests: string[];
  counts: Counts;
  pagination: { page: number; pageSize: number; totalPages: number };
  intelligence: { enabled: boolean; used: boolean; summary: string | null; terms: string[] };
};
type AssistantResponse = {
  answer: string;
  references: Array<{ id: string; label: string; href: string; type: string }>;
  provider?: 'gemini' | 'claude';
};

const emptyResults: SearchResponse = {
  query: '', category: 'all', businesses: [], events: [], posts: [], people: [], groups: [], jobs: [], housing: [], interests: [],
  counts: { businesses: 0, events: 0, posts: 0, people: 0, groups: 0, jobs: 0, housing: 0, interests: 0, total: 0 },
  pagination: { page: 1, pageSize: 6, totalPages: 1 },
  intelligence: { enabled: true, used: false, summary: null, terms: [] },
};

const tabs: Array<{ id: SearchCategory; label: string }> = [
  { id: 'all', label: 'Tudo' }, { id: 'people', label: 'Pessoas' }, { id: 'groups', label: 'Grupos' },
  { id: 'businesses', label: 'Negócios' }, { id: 'jobs', label: 'Vagas' }, { id: 'events', label: 'Eventos' },
  { id: 'housing', label: 'Moradias' },
  { id: 'posts', label: 'Comunidade' }, { id: 'interests', label: 'Interesses' },
];

const formatDateTime = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const buildAssistantSummary = (results: SearchResponse) => {
  const parts = [
    results.counts.businesses ? `${results.counts.businesses} negócio${results.counts.businesses === 1 ? '' : 's'}` : '',
    results.counts.events ? `${results.counts.events} evento${results.counts.events === 1 ? '' : 's'}` : '',
    results.counts.jobs ? `${results.counts.jobs} vaga${results.counts.jobs === 1 ? '' : 's'}` : '',
    results.counts.groups ? `${results.counts.groups} grupo${results.counts.groups === 1 ? '' : 's'}` : '',
    results.counts.posts ? `${results.counts.posts} publicaç${results.counts.posts === 1 ? 'ão' : 'ões'}` : '',
    results.counts.people ? `${results.counts.people} pessoa${results.counts.people === 1 ? '' : 's'}` : '',
    results.counts.housing ? `${results.counts.housing} moradia${results.counts.housing === 1 ? '' : 's'}` : '',
  ].filter(Boolean);

  if (parts.length === 0) {
    return 'Não encontrei uma resposta nos conteúdos públicos da comunidade. Tente detalhar o serviço, assunto ou localidade.';
  }

  return `Encontrei ${parts.slice(0, 3).join(', ')} relacionados ao seu pedido. Estas sugestões vêm dos dados publicados no Gringoou.`;
};

const buildAssistantContext = (results: SearchResponse) => [
  ...results.businesses.slice(0, 5).map((item) => ({ id: `business:${item.id}`, type: 'business', title: item.name, description: `${item.description || item.category}${item.ratingCount ? ` · avaliação ${item.ratingAverage.toFixed(1)}/5 (${item.ratingCount})` : ''}`, location: item.locationLabel, href: `/negocios/${item.slug}` })),
  ...results.events.slice(0, 5).map((item) => ({ id: `event:${item.id}`, type: 'event', title: item.title, description: `${item.description} · início ${item.startsAt}${item.endsAt ? ` · fim ${item.endsAt}` : ''}`, location: item.locationLabel, href: `/eventos/${item.slug}` })),
  ...results.jobs.slice(0, 4).map((item) => ({ id: `job:${item.id}`, type: 'job', title: item.title, description: `${item.company} · ${item.employmentType}${item.salary ? ` · ${item.salary}` : ''}`, location: item.locationLabel, href: `/vagas/${item.id}` })),
  ...results.groups.slice(0, 4).map((item) => ({ id: `group:${item.id}`, type: 'group', title: item.name, description: item.description || item.category || 'Grupo da comunidade', location: item.region?.label || item.countryCode, href: `/grupos/${item.slug}` })),
  ...results.posts.slice(0, 4).map((item) => ({ id: `post:${item.id}`, type: 'post', title: item.author.name || 'Publicação da comunidade', description: item.content, location: item.locationLabel, href: `/community?post=${item.id}` })),
  ...results.housing.slice(0, 4).map((item) => ({ id: `housing:${item.id}`, type: 'housing', title: item.title, description: `${item.propertyType} · ${item.price} · ${item.description}`, location: item.locationLabel, href: `/moradia/${item.id}` })),
  ...results.people.slice(0, 4).map((item) => ({ id: `person:${item.id}`, type: 'person', title: item.name || `@${item.username || 'perfil'}`, description: `@${item.username || 'perfil'}${item.interests.length ? ` · ${item.interests.join(', ')}` : ''}`, location: item.locationLabel || '', href: item.username ? `/${item.username}` : '/community' })),
].slice(0, 30).map((item) => ({ ...item, description: item.description.slice(0, 320) }));

const SearchResults: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const paramsKey = searchParams?.toString() ?? '';
  const params = useMemo(() => new URLSearchParams(paramsKey), [paramsKey]);
  const queryFromUrl = params.get('q')?.trim() ?? '';
  const browseMode = params.get('browse') === '1';
  const activeTab = (params.get(browseMode ? 'view' : 'category') || 'all') as SearchCategory;
  const assistantEnabled = params.get('assistant') === '1';
  const [results, setResults] = useState<SearchResponse>(emptyResults);
  const [loading, setLoading] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState<AssistantResponse | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState({ region: '', country: '', city: '', businessType: '', propertyType: '', dateScope: 'future' });

  useEffect(() => setFilterDraft({
    region: params.get('region') || '',
    country: params.get('country') || '',
    city: params.get('city') || '',
    businessType: params.get('businessType') || '',
    propertyType: params.get('propertyType') || '',
    dateScope: params.get('dateScope') || 'future',
  }), [paramsKey]);
  useEffect(() => {
    let ignore = false;
    const hasCriteria = Boolean(params.get('browse') === '1' || queryFromUrl || params.get('region') !== null || params.get('country') || params.get('city') || params.get('businessType') || params.get('propertyType') || params.get('dateScope'));
    if (!hasCriteria) { setResults(emptyResults); return; }
    setLoading(true);
    fetch(`/api/search?${paramsKey}`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload) throw new Error(payload?.error || 'Não foi possível buscar agora.');
        if (!ignore) startTransition(() => setResults(payload));
      })
      .catch((error) => { if (!ignore) { setResults(emptyResults); showToast(error instanceof Error ? error.message : 'Não foi possível buscar agora.', 'error'); } })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [paramsKey, queryFromUrl, showToast]);

  useEffect(() => {
    let ignore = false;
    if (!assistantEnabled || !queryFromUrl || results.query !== queryFromUrl || loading) {
      if (!assistantEnabled) setAssistantResponse(null);
      return;
    }

    const context = buildAssistantContext(results);
    setAssistantLoading(true);
    setAssistantError(null);
    fetch('/api/search/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: queryFromUrl, context }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.answer) throw new Error(payload?.error || 'O assistente não conseguiu responder.');
        if (!ignore) setAssistantResponse(payload);
      })
      .catch((error) => {
        if (!ignore) setAssistantError(error instanceof Error ? error.message : 'O assistente não conseguiu responder.');
      })
      .finally(() => { if (!ignore) setAssistantLoading(false); });

    return () => { ignore = true; };
  }, [assistantEnabled, loading, queryFromUrl, results]);

  const navigateWith = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([key, value]) => value === null ? next.delete(key) : next.set(key, value));
    if (!('page' in updates)) next.delete('page');
    router.push(buildSearchPath(next.get('q') || '', next));
  };
  const clearFilters = () => {
    setFilterDraft({ region: '', country: '', city: '', businessType: '', propertyType: '', dateScope: 'future' });
    navigateWith({ region: null, country: null, city: null, businessType: null, propertyType: null, dateScope: null, page: null });
  };
  const visible = (category: Exclude<SearchCategory, 'all'>) => activeTab === 'all' || activeTab === category;
  const hasCriteria = Boolean(params.get('browse') === '1' || queryFromUrl || params.get('region') !== null || params.get('country') || params.get('city') || params.get('businessType') || params.get('propertyType') || params.get('dateScope'));

  return (
    <ContentColumn className="animate-in space-y-6 px-5 py-4 pb-24 fade-in duration-500">
      <header><h1 className="text-h2 font-bold text-foreground">Busca</h1><p className="mt-1 text-sm text-slate-500">Encontre pessoas, grupos, negócios, eventos, vagas e conversas.</p></header>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setFiltersOpen((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700"><SlidersHorizontal size={15} /> Filtros</button>
      </div>

      {filtersOpen ? <section className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <RegionSelector value={filterDraft.region} onChange={(region) => setFilterDraft((current) => ({ ...current, region: region.key }))} onClear={() => setFilterDraft((current) => ({ ...current, region: '' }))} allowEmpty emptyLabel="Todas as regiões" label="Localidade" />
        <label className="space-y-2"><span className="text-sm font-bold">País</span><select value={filterDraft.country} onChange={(event) => setFilterDraft((current) => ({ ...current, country: event.target.value }))} className="h-11 w-full rounded-full border-2 border-border bg-white px-4 text-sm"><option value="">Todos</option><option value="US">Estados Unidos</option><option value="BR">Brasil</option><option value="PT">Portugal</option><option value="CA">Canadá</option><option value="GB">Reino Unido</option><option value="IE">Irlanda</option></select></label>
        <label className="space-y-2"><span className="text-sm font-bold">Cidade ou estado</span><input value={filterDraft.city} onChange={(event) => setFilterDraft((current) => ({ ...current, city: event.target.value }))} placeholder="Ex.: Boston" className="h-11 w-full rounded-full border-2 border-border bg-white px-4 text-sm outline-none" /></label>
        <label className="space-y-2"><span className="text-sm font-bold">Tipo de negócio</span><input value={filterDraft.businessType} onChange={(event) => setFilterDraft((current) => ({ ...current, businessType: event.target.value }))} placeholder="Ex.: Restaurante" className="h-11 w-full rounded-full border-2 border-border bg-white px-4 text-sm outline-none" /></label>
        <label className="space-y-2"><span className="text-sm font-bold">Tipo de moradia</span><input value={filterDraft.propertyType} onChange={(event) => setFilterDraft((current) => ({ ...current, propertyType: event.target.value }))} placeholder="Ex.: Apartamento" className="h-11 w-full rounded-full border-2 border-border bg-white px-4 text-sm outline-none" /></label>
        <label className="space-y-2"><span className="text-sm font-bold">Período dos eventos</span><select value={filterDraft.dateScope} onChange={(event) => setFilterDraft((current) => ({ ...current, dateScope: event.target.value }))} className="h-11 w-full rounded-full border-2 border-border bg-white px-4 text-sm"><option value="future">Próximos eventos</option><option value="today">Hoje</option><option value="weekend">Fim de semana</option><option value="ongoing">Acontecendo agora</option><option value="past">Eventos anteriores</option><option value="any">Todos os eventos</option></select></label>
        <div className="flex flex-wrap gap-2 sm:col-span-2"><button type="button" onClick={() => navigateWith({ region: filterDraft.region, country: filterDraft.country || null, city: filterDraft.city || null, businessType: filterDraft.businessType || null, propertyType: filterDraft.propertyType || null, dateScope: filterDraft.dateScope === 'future' ? null : filterDraft.dateScope, page: null })} className="inline-flex h-10 items-center justify-center rounded-full bg-brand-500 px-5 text-xs font-bold text-white">Aplicar filtros</button><button type="button" onClick={clearFilters} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 text-xs font-bold text-red-700"><X size={14} /> Limpar filtros</button></div>
      </section> : null}

      <nav className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label="Categorias da busca">
        {tabs.map((tab) => <button key={tab.id} type="button" onClick={() => navigateWith(browseMode ? { view: tab.id === 'all' ? null : tab.id, category: null, page: null } : { category: tab.id === 'all' ? null : tab.id, page: null })} className={`whitespace-nowrap rounded-2xl border px-4 py-2 text-xs font-bold ${activeTab === tab.id ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>{tab.label} ({tab.id === 'all' ? results.counts.total : results.counts[tab.id]})</button>)}
      </nav>

      {!hasCriteria ? <EmptyState text="Digite um termo ou selecione filtros para buscar no app." /> : null}
      {loading ? <div className="space-y-3"><div className="h-28 animate-pulse rounded-3xl bg-white" /><div className="h-28 animate-pulse rounded-3xl bg-white" /><div className="h-28 animate-pulse rounded-3xl bg-white" /></div> : null}
      {!loading && hasCriteria && results.counts.total === 0 ? <EmptyState text="Nenhum resultado encontrado com os filtros atuais." /> : null}
      {!loading && assistantEnabled && hasCriteria ? (
        <section className="rounded-[24px] border border-brand-100 bg-brand-50/70 p-4" aria-live="polite">
          <div className="flex items-center gap-2 text-sm font-bold text-brand-700"><Sparkles size={17} /> Assistente da comunidade</div>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
            {assistantLoading ? 'Analisando os resultados públicos da comunidade...' : assistantResponse?.answer || buildAssistantSummary(results)}
          </p>
          {assistantResponse?.references.length ? <div className="mt-3 flex flex-wrap gap-2">{assistantResponse.references.map((reference) => <Link key={reference.id} href={reference.href} className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-50">{reference.label}</Link>)}</div> : null}
          {assistantError ? <p className="mt-2 text-xs text-amber-700">{assistantError} Exibindo o resumo local.</p> : null}
          <p className="mt-2 text-xs text-slate-500">Resposta gerada por {assistantResponse?.provider === 'claude' ? 'Claude' : assistantResponse?.provider === 'gemini' ? 'Gemini' : 'IA'} a partir de resultados públicos do Gringoou. Confirme informações importantes diretamente na página indicada.</p>
        </section>
      ) : null}
      {!loading && results.intelligence.used ? <div className="rounded-[24px] border border-violet-100 bg-violet-50/70 p-4 text-sm text-violet-800"><p className="font-bold">Busca inteligente local</p><p className="mt-1">{results.intelligence.summary}</p></div> : null}

      {!loading && hasCriteria ? <div className="space-y-7">
        {visible('people') && results.people.length ? <ResultSection title="Pessoas" icon={<UserRound size={16} />}>{results.people.map((person) => <Link key={person.id} href={`/${person.username}`} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><img src={person.image || `https://picsum.photos/seed/${person.id}/120`} alt={person.name || 'Pessoa'} className="h-14 w-14 rounded-full object-cover" /><div className="min-w-0"><p className="truncate font-bold">{person.name || 'Membro da comunidade'}</p><p className="text-xs text-brand-600">@{person.username}</p>{person.locationLabel ? <p className="mt-1 text-xs text-slate-500">{person.locationLabel}</p> : null}</div></Link>)}</ResultSection> : null}
        {visible('groups') && results.groups.length ? <ResultSection title="Grupos" icon={<UsersRound size={16} />}>{results.groups.map((group) => <Link key={group.id} href={`/grupos/${group.slug}`} className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><img src={group.imageUrl || group.coverImageUrl || `https://picsum.photos/seed/${group.id}/160`} alt={group.name} className="h-16 w-16 rounded-2xl object-cover" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-bold">{group.name}</p>{!group.isPublic ? <LockKeyhole size={14} className="text-slate-400" /> : null}</div><p className="mt-1 line-clamp-2 text-sm text-slate-600">{group.description || group.category || 'Grupo da comunidade'}</p><p className="mt-2 text-xs text-slate-500">{group.region?.label || group.countryCode} · {group._count.members} membros</p></div></Link>)}</ResultSection> : null}
        {visible('businesses') && results.businesses.length ? <ResultSection title="Negócios" icon={<Store size={16} />}>{results.businesses.map((business) => <Link key={business.id} href={`/negocios/${business.slug}`} className="flex min-h-32 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"><img src={business.imageUrl || `https://picsum.photos/seed/${business.id}/240`} alt={business.name} className="w-28 object-cover" /><div className="min-w-0 p-4"><p className="font-bold">{business.name}</p><p className="mt-1 text-xs font-bold uppercase text-brand-500">{business.category}</p><p className="mt-2 line-clamp-2 text-sm text-slate-600">{business.description || business.address}</p><p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} /> {business.locationLabel}</p></div></Link>)}</ResultSection> : null}
        {visible('jobs') && results.jobs.length ? <ResultSection title="Vagas" icon={<Briefcase size={16} />}>{results.jobs.map((job) => <Link key={job.id} href={`/vagas/${job.id}`} className="flex min-h-32 w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-200 hover:shadow-md"><div className="flex w-20 shrink-0 items-center justify-center bg-brand-50 text-brand-500 sm:w-24"><Briefcase size={26} /></div><div className="min-w-0 flex-1 p-4"><p className="line-clamp-2 break-words font-bold leading-5 text-slate-900">{job.title}</p><p className="mt-1 truncate text-sm font-semibold text-brand-600">{job.company}</p><p className="mt-3 flex min-w-0 items-center gap-1.5 text-xs text-slate-500"><MapPin size={13} className="shrink-0" /><span className="truncate">{job.locationLabel}</span></p><div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-500"><span className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 font-semibold">{job.employmentType}</span>{job.salary ? <span className="min-w-0 break-words font-semibold text-slate-700">{job.salary}</span> : null}</div></div></Link>)}</ResultSection> : null}
        {visible('housing') && results.housing.length ? <ResultSection title="Moradias" icon={<House size={16} />}>{results.housing.map((item) => <Link key={item.id} href={`/moradia/${item.id}`} className="flex min-h-32 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">{item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="w-28 object-cover" /> : null}<div className="min-w-0 p-4"><p className="font-bold">{item.title}</p><p className="mt-1 text-xs font-bold uppercase text-brand-500">{item.propertyType}</p><p className="mt-2 font-semibold text-slate-700">{item.price}</p><p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} /> {item.locationLabel}</p></div></Link>)}</ResultSection> : null}
        {visible('events') && results.events.length ? <ResultSection title="Eventos" icon={<CalendarDays size={16} />}>{results.events.map((event) => <Link key={event.id} href={`/eventos/${event.slug}`} className="flex min-h-32 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"><img src={event.imageUrl || `https://picsum.photos/seed/${event.id}/240`} alt={event.title} className="w-28 object-cover" /><div className="min-w-0 p-4"><p className="font-bold">{event.title}</p><p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Clock3 size={12} /> {formatDateTime(event.startsAt)}</p><p className="mt-1 text-xs text-slate-500">{event.venueName}</p></div></Link>)}</ResultSection> : null}
        {visible('posts') && results.posts.length ? <ResultSection title="Comunidade" icon={<Users size={16} />}>{results.posts.map((post) => <Link key={post.id} href={`/community?post=${post.id}`} className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><img src={post.author.image || `https://picsum.photos/seed/${post.id}/120`} alt={post.author.name || 'Autor'} className="h-12 w-12 rounded-full object-cover" /><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate font-bold">{post.author.name || 'Membro'}</p>{post.authorType === 'BUSINESS' ? <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-bold text-brand-600">NEGÓCIO</span> : null}</div><p className="mt-2 line-clamp-3 text-sm text-slate-600">{post.content}</p><p className="mt-2 text-xs text-slate-500">{post._count.reactions} curtidas · {post._count.comments} comentários</p></div></Link>)}</ResultSection> : null}
        {visible('interests') && results.interests.length ? <ResultSection title="Interesses" icon={<Sparkles size={16} />}><div className="flex flex-wrap gap-2">{results.interests.map((interest) => <button key={interest} type="button" onClick={() => router.push(buildSearchPath(interest, params))} className="rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">{interest}</button>)}</div></ResultSection> : null}
      </div> : null}

      {!loading && results.pagination.totalPages > 1 ? <div className="flex items-center justify-center gap-3"><button type="button" disabled={results.pagination.page <= 1} onClick={() => navigateWith({ page: String(results.pagination.page - 1) })} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">Anterior</button><span className="text-sm text-slate-500">{results.pagination.page} de {results.pagination.totalPages}</span><button type="button" disabled={results.pagination.page >= results.pagination.totalPages} onClick={() => navigateWith({ page: String(results.pagination.page + 1) })} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">Próxima</button></div> : null}
    </ContentColumn>
  );
};

const ResultSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => <section className="space-y-3"><div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500"><span className="text-brand-500">{icon}</span>{title}</div><div className="space-y-3">{children}</div></section>;
const EmptyState: React.FC<{ text: string }> = ({ text }) => <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm font-medium text-slate-500"><Search size={24} className="mx-auto mb-3 text-slate-300" />{text}</div>;

export default SearchResults;
