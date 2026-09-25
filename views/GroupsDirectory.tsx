'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, Plus, Search, UsersRound } from 'lucide-react';
import PageHeader from '@/components/navigation/PageHeader';
import { ContentColumn } from '@/components/ui/ContentColumn';
import { useIntersectionTrigger } from '@/hooks/useIntersectionTrigger';
import { loadRegionGroups } from '@/lib/content-api';
import type { RegionalGroupCard } from '@/lib/content-contracts';
import type { User } from '@/types';

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const formatCompactMemberCount = (count: number) => {
  if (count < 1000) return `${count}`;
  const compactValue = count / 1000;
  const formattedValue = Number.isInteger(compactValue) ? compactValue.toFixed(0) : compactValue.toFixed(1);
  return `${formattedValue.replace('.', ',')}k`;
};

const countries = [
  ['US', 'Estados Unidos'],
  ['BR', 'Brasil'],
  ['PT', 'Portugal'],
  ['CA', 'Canada'],
  ['GB', 'Reino Unido'],
  ['IE', 'Irlanda'],
] as const;

const groupMatchesSearch = (group: RegionalGroupCard, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [group.name, group.category, group.regionLabel]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedQuery));
};

const GroupAvatar = ({ group }: { group: RegionalGroupCard }) => (
  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-lg font-bold text-brand-700">
    {group.imageUrl || group.coverImageUrl ? (
      <img src={group.imageUrl || group.coverImageUrl || ''} alt="" className="h-full w-full object-cover" />
    ) : (
      getInitials(group.name)
    )}
  </div>
);

const GroupRow = ({ group }: { group: RegionalGroupCard }) => (
  <Link
    href={group.publicPath}
    className="group flex min-h-[76px] items-center gap-3 rounded-2xl px-1 py-2 transition hover:bg-slate-50"
  >
    <GroupAvatar group={group} />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-extrabold text-slate-900 group-hover:text-brand-700">{group.name}</p>
      <p className="mt-1 text-sm text-slate-600">{formatCompactMemberCount(group.memberCount)} membros</p>
      {group.category ? <p className="mt-0.5 truncate text-xs text-slate-400">{group.category}</p> : null}
    </div>
    <span className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-slate-100 px-5 text-sm font-bold text-slate-900 transition group-hover:bg-brand-500 group-hover:text-white">
      Entrar
    </span>
  </Link>
);

const GroupsDirectory: React.FC<{ user: User }> = ({ user }) => {
  const [groups, setGroups] = useState<RegionalGroupCard[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextOffset, setNextOffset] = useState(0);
  const [country, setCountry] = useState('US');
  const [query, setQuery] = useState('');
  const [myGroups, setMyGroups] = useState<RegionalGroupCard[]>([]);

  const filteredGroups = useMemo(() => groups.filter((group) => groupMatchesSearch(group, query)), [groups, query]);

  const loadGroupsPage = useCallback(
    async ({ offset, replace }: { offset: number; replace: boolean }) => {
      if (!user.regionKey && !country) {
        setGroups([]);
        setLoadingInitial(false);
        setLoadingMore(false);
        setHasMore(false);
        setNextOffset(0);
        return;
      }

      if (replace) setLoadingInitial(true);
      else setLoadingMore(true);

      try {
        const payload = await loadRegionGroups({
          regionKey: country === 'US' ? user.regionKey : undefined,
          country,
          limit: 12,
          offset,
        });

        setGroups((current) => (replace ? payload.groups : [...current, ...payload.groups]));
        setHasMore(payload.hasMore);
        setNextOffset(payload.nextOffset);
      } catch (error) {
        console.error('Failed to load groups:', error);
        if (replace) {
          setGroups([]);
          setHasMore(false);
          setNextOffset(0);
        }
      } finally {
        setLoadingInitial(false);
        setLoadingMore(false);
      }
    },
    [country, user.regionKey],
  );

  const reloadGroups = useCallback(async () => {
    setGroups([]);
    setHasMore(true);
    setNextOffset(0);
    await loadGroupsPage({ offset: 0, replace: true });
  }, [loadGroupsPage]);

  const loadMoreGroups = useCallback(async () => {
    if (!hasMore || loadingInitial || loadingMore) return;
    await loadGroupsPage({ offset: nextOffset, replace: false });
  }, [hasMore, loadGroupsPage, loadingInitial, loadingMore, nextOffset]);

  const sentinelRef = useIntersectionTrigger(
    () => {
      if (!hasMore || loadingInitial || loadingMore) return;
      void loadMoreGroups();
    },
    { enabled: Boolean(user.regionKey || country) && hasMore },
  );

  useEffect(() => {
    void reloadGroups();
  }, [country, reloadGroups, user.regionKey]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/groups?mine=1&limit=8', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => setMyGroups(Array.isArray(payload?.groups) ? payload.groups : []))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <ContentColumn size="wide" className="animate-in px-5 pb-20 fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="Grupos"
        action={
          <Link
            href="/profile?tab=groups"
            aria-label="Criar ou gerenciar grupos"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-900 transition hover:bg-brand-50 hover:text-brand-700"
          >
            <Plus size={22} />
          </Link>
        }
      />

      <div className="mt-4 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main className="min-w-0 space-y-6">
          <div className="space-y-3">
            <label className="flex h-12 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 text-slate-500 shadow-sm focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100">
              <Search size={20} className="shrink-0 text-slate-600" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar em todos os grupos"
                className="min-w-0 flex-1 bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-500"
              />
            </label>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {countries.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCountry(value)}
                  className={`h-9 shrink-0 rounded-full px-4 text-xs font-bold transition ${
                    country === value
                      ? 'bg-brand-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {user.regionKey ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
              <MapPin size={15} className="text-brand-500" />
              {user.location}
            </div>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">Grupos perto de voce</h2>
              <span className="text-xs font-bold text-slate-400">{filteredGroups.length}</span>
            </div>

            {loadingInitial ? (
              <div className="space-y-3">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="flex animate-pulse items-center gap-3 rounded-2xl py-2">
                    <div className="h-14 w-14 rounded-full bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/3 rounded-full bg-slate-100" />
                      <div className="h-3 w-1/3 rounded-full bg-slate-100" />
                    </div>
                    <div className="h-10 w-20 rounded-full bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
                Nenhum grupo encontrado agora.
              </div>
            ) : (
              <div className="space-y-1">
                {filteredGroups.map((group) => <GroupRow key={group.id} group={group} />)}
                {loadingMore ? <div className="h-16 animate-pulse rounded-2xl bg-slate-100" /> : null}
                {hasMore ? <div ref={sentinelRef} className="h-1" aria-hidden="true" /> : null}
              </div>
            )}
          </section>
        </main>

        <aside className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center gap-2">
            <UsersRound size={17} className="text-brand-500" />
            <h2 className="text-sm font-extrabold text-slate-900">Seus grupos</h2>
          </div>
          <div className="mt-4 space-y-2">
            {myGroups.length ? (
              myGroups.map((group) => (
                <Link key={group.id} href={group.publicPath} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-brand-50">
                  <GroupAvatar group={group} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800">{group.name}</p>
                    <p className="truncate text-[10px] text-slate-400">{formatCompactMemberCount(group.memberCount)} membros</p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl bg-slate-50 px-3 py-5 text-center text-xs text-slate-500">
                Voce ainda nao participa de grupos.
              </p>
            )}
          </div>
        </aside>
      </div>
    </ContentColumn>
  );
};

export default GroupsDirectory;
