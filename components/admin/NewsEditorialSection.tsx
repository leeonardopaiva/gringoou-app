'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ExternalLink, Newspaper, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import CloudinaryImageField from '@/components/forms/CloudinaryImageField';
import { useToast } from '@/components/feedback/ToastProvider';
import { Badge, Button, Modal, Skeleton } from '@/components/ui';
import { NEWS_CATEGORIES, getNewsCategoryLabel } from '@/lib/news';
import type { NewsAdminArticleContract } from '@/lib/content-contracts';

type Filters = { status: string; authorId: string; category: string; from: string; to: string; q: string };
type FormState = {
  title: string;
  subtitle: string;
  imageUrl: string;
  category: string;
  regionKey: string;
  source: string;
  externalUrl: string;
};
type RegionOption = { key: string; label: string };

const EMPTY_FILTERS: Filters = { status: '', authorId: '', category: '', from: '', to: '', q: '' };
const EMPTY_FORM: FormState = {
  title: '',
  subtitle: '',
  imageUrl: '',
  category: NEWS_CATEGORIES[0].id,
  regionKey: '',
  source: '',
  externalUrl: '',
};

const fieldClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100';
const labelClass = 'block text-xs font-semibold text-slate-600';

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

/** Gestão editorial de Notícias (MODERATOR/ADMIN; autorização validada nas APIs /api/admin/news). */
export default function NewsEditorialSection() {
  const { showToast } = useToast();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<NewsAdminArticleContract[]>([]);
  const [authors, setAuthors] = useState<Array<{ id: string; name: string }>>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<RegionOption[]>([]);

  const [editing, setEditing] = useState<NewsAdminArticleContract | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<NewsAdminArticleContract | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
      const response = await fetch(`/api/admin/news?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível carregar as notícias.');
      setItems(payload.items ?? []);
      setAuthors(payload.authors ?? []);
      setTotalPages(payload.totalPages ?? 1);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível carregar as notícias.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, page, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetch('/api/regions')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => setRegions(payload?.regions ?? []))
      .catch(() => undefined);
  }, []);

  const updateFilter = (key: keyof Filters, value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const openEditor = (article: NewsAdminArticleContract | 'new') => {
    setEditing(article);
    setForm(
      article === 'new'
        ? EMPTY_FORM
        : {
            title: article.title,
            subtitle: article.subtitle ?? '',
            imageUrl: article.imageUrl ?? '',
            category: article.category,
            regionKey: article.regionKey ?? '',
            source: article.source,
            externalUrl: article.externalUrl,
          },
    );
  };

  const send = async (article: NewsAdminArticleContract | 'new', body: Record<string, unknown>) => {
    const isNew = article === 'new';
    const response = await fetch(isNew ? '/api/admin/news' : `/api/admin/news/${article.id}`, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Não foi possível salvar a notícia.');
  };

  const save = async (event: FormEvent, status: 'DRAFT' | 'PUBLISHED') => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await send(editing, {
        ...form,
        status,
        publishedAt: editing !== 'new' ? editing.publishedAt : null,
      });
      showToast(status === 'PUBLISHED' ? 'Notícia publicada.' : 'Rascunho salvo.', 'success');
      setEditing(null);
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar a notícia.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (article: NewsAdminArticleContract) => {
    setBusyId(article.id);
    try {
      await send(article, {
        title: article.title,
        subtitle: article.subtitle,
        imageUrl: article.imageUrl,
        category: article.category,
        regionKey: article.regionKey,
        source: article.source,
        externalUrl: article.externalUrl,
        status: article.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
        publishedAt: article.publishedAt,
      });
      showToast(article.status === 'PUBLISHED' ? 'Notícia despublicada.' : 'Notícia publicada.', 'success');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível atualizar a notícia.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      const response = await fetch(`/api/admin/news/${deleting.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível excluir a notícia.');
      showToast('Notícia excluída.', 'success');
      setDeleting(null);
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível excluir a notícia.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const setField = (key: keyof FormState) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <section className="mx-auto max-w-6xl p-5 sm:p-8">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Newspaper size={19} className="text-brand-500" /> Notícias
            </h2>
            <p className="mt-1 text-sm text-slate-500">Crie, edite, publique e organize as notícias exibidas na comunidade.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Atualizar notícias"
            >
              <RefreshCcw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
            <Button size="sm" iconLeft={<Plus size={16} />} onClick={() => openEditor('new')}>
              Nova notícia
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <input
            type="search"
            value={filters.q}
            onChange={(event) => updateFilter('q', event.target.value)}
            placeholder="Buscar título ou fonte"
            aria-label="Buscar notícias"
            className={`${fieldClass} lg:col-span-2`}
          />
          <select aria-label="Status" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className={fieldClass}>
            <option value="">Todos os status</option>
            <option value="DRAFT">Rascunho</option>
            <option value="PUBLISHED">Publicada</option>
          </select>
          <select aria-label="Autor" value={filters.authorId} onChange={(event) => updateFilter('authorId', event.target.value)} className={fieldClass}>
            <option value="">Todos os autores</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.name}
              </option>
            ))}
          </select>
          <select aria-label="Categoria" value={filters.category} onChange={(event) => updateFilter('category', event.target.value)} className={fieldClass}>
            <option value="">Todas as categorias</option>
            {NEWS_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input type="date" aria-label="Criada a partir de" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} className={fieldClass} />
            <input type="date" aria-label="Criada até" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} className={fieldClass} />
          </div>
        </div>

        {loading ? (
          <div className="mt-5 space-y-3" role="status" aria-label="Carregando notícias"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
        ) : items.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Nenhuma notícia encontrada.</div>
        ) : (
          <div className="mt-5 divide-y divide-slate-100">
            {items.map((article) => {
              const busy = busyId === article.id;
              return (
                <article key={article.id} className="grid gap-3 py-4 sm:grid-cols-[96px_1fr_auto]">
                  <div className="h-20 w-24 overflow-hidden rounded-xl bg-slate-100">
                    {article.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={article.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300">
                        <Newspaper size={26} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={article.status === 'PUBLISHED' ? 'success' : 'destaque'}>
                        {article.status === 'PUBLISHED' ? 'Publicada' : 'Rascunho'}
                      </Badge>
                      <span className="text-xs text-slate-500">{getNewsCategoryLabel(article.category)}</span>
                      {article.regionLabel ? <span className="text-xs text-slate-400">· {article.regionLabel}</span> : null}
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">{article.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {article.source} · {article.authorName ?? 'Autor removido'} · atualizada em {formatDate(article.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <a
                      href={article.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      aria-label="Abrir matéria original"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                    >
                      <ExternalLink size={16} />
                    </a>
                    <Button size="xs" variant="secondary" disabled={busy} onClick={() => void togglePublish(article)}>
                      {article.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                    </Button>
                    <Button size="xs" variant="ghost" iconLeft={<Pencil size={14} />} disabled={busy} onClick={() => openEditor(article)}>
                      Editar
                    </Button>
                    <Button size="xs" variant="ghost" iconLeft={<Trash2 size={14} />} disabled={busy} onClick={() => setDeleting(article)}>
                      Excluir
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-slate-600">
            <Button size="xs" variant="ghost" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>
              Anterior
            </Button>
            <span>
              Página {page} de {totalPages}
            </span>
            <Button size="xs" variant="ghost" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>
              Próxima
            </Button>
          </div>
        ) : null}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => (saving ? undefined : setEditing(null))}
        title={editing === 'new' ? 'Nova notícia' : 'Editar notícia'}
      >
        <form className="space-y-3" onSubmit={(event) => void save(event, 'PUBLISHED')}>
          <label className={labelClass}>
            Título
            <input required maxLength={200} value={form.title} onChange={(event) => setField('title')(event.target.value)} className={`${fieldClass} mt-1`} />
          </label>
          <label className={labelClass}>
            Subtítulo / resumo
            <textarea
              maxLength={400}
              rows={3}
              value={form.subtitle}
              onChange={(event) => setField('subtitle')(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <div>
            <span className={labelClass}>Imagem de capa</span>
            <div className="mt-1">
              <CloudinaryImageField value={form.imageUrl} onChange={setField('imageUrl')} folder="news" cropAspect={16 / 9} height={140} hint="Opcional. Sem imagem, o card usa um fallback." />
            </div>
            <input
              type="url"
              inputMode="url"
              placeholder="ou cole o link da imagem"
              aria-label="Link da imagem"
              value={form.imageUrl}
              onChange={(event) => setField('imageUrl')(event.target.value)}
              className={`${fieldClass} mt-2`}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Categoria
              <select value={form.category} onChange={(event) => setField('category')(event.target.value)} className={`${fieldClass} mt-1`}>
                {NEWS_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Região
              <select value={form.regionKey} onChange={(event) => setField('regionKey')(event.target.value)} className={`${fieldClass} mt-1`}>
                <option value="">Todas as regiões</option>
                {regions.map((region) => (
                  <option key={region.key} value={region.key}>
                    {region.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={labelClass}>
            Fonte
            <input required maxLength={120} value={form.source} onChange={(event) => setField('source')(event.target.value)} className={`${fieldClass} mt-1`} />
          </label>
          <label className={labelClass}>
            Link da matéria original
            <input
              required
              type="url"
              inputMode="url"
              placeholder="https://"
              value={form.externalUrl}
              onChange={(event) => setField('externalUrl')(event.target.value)}
              className={`${fieldClass} mt-1`}
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="secondary" disabled={saving} onClick={(event) => void save(event, 'DRAFT')}>
              Salvar rascunho
            </Button>
            <Button type="submit" disabled={saving}>
              Publicar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Excluir notícia?"
        description={deleting ? `"${deleting.title}" será removida permanentemente.` : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={busyId !== null} onClick={() => void confirmDelete()}>
              Excluir
            </Button>
          </div>
        }
      />
    </section>
  );
}
