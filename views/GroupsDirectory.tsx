'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, UsersRound } from 'lucide-react';
import { useIntersectionTrigger } from '../hooks/useIntersectionTrigger';
import { loadRegionGroups } from '../lib/content-api';
import type { RegionalGroupCard } from '../lib/content-contracts';
import type { User } from '../types';
import { ContentColumn } from '../components/ui/ContentColumn';

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const formatCompactMemberCount = (count: number) => {
  if (count < 1000) {
    return `${count}`;
  }

  const compactValue = count / 1000;
  const formattedValue = Number.isInteger(compactValue) ? compactValue.toFixed(0) : compactValue.toFixed(1);

  return `${formattedValue.replace('.', ',')}k`;
};

const GroupsDirectory: React.FC<{ user: User }> = ({ user }) => {
  const [groups, setGroups] = useState<RegionalGroupCard[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextOffset, setNextOffset] = useState(0);
  const [country, setCountry] = useState('US');
  const [myGroups, setMyGroups] = useState<RegionalGroupCard[]>([]);

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

      if (replace) {
        setLoadingInitial(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const payload = await loadRegionGroups({
          regionKey: country === 'US' ? user.regionKey : undefined,
          country,
          limit: 8,
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
    if (!hasMore || loadingInitial || loadingMore) {
      return;
    }

    await loadGroupsPage({ offset: nextOffset, replace: false });
  }, [hasMore, loadGroupsPage, loadingInitial, loadingMore, nextOffset]);

  const sentinelRef = useIntersectionTrigger(
    () => {
      if (!hasMore || loadingInitial || loadingMore) {
        return;
      }

      void loadMoreGroups();
    },
    { enabled: Boolean(user.regionKey || country) && hasMore },
  );

  useEffect(() => {
    void reloadGroups();
  }, [country, reloadGroups, user.regionKey]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/groups?mine=1&limit=8', { signal: controller.signal }).then((response) => response.ok ? response.json() : null).then((payload) => setMyGroups(Array.isArray(payload?.groups) ? payload.groups : [])).catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <ContentColumn size="wide" className="animate-in space-y-5 px-5 pb-20 fade-in slide-in-from-bottom-4 duration-500">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-500">
              <UsersRound size={13} />
              Grupos
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Grupos populares
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Priorizamos os grupos com mais membros e os mais recentes da sua região. Quando não houver
                volume local suficiente, mostramos sugestões públicas da comunidade.
              </p>
            </div>
          </div>

          {user.regionKey ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
              <MapPin size={16} className="text-brand-500" />
              {user.location}
            </div>
          ) : null}
          <label className="space-y-1"><span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">País</span><select value={country} onChange={(event) => setCountry(event.target.value)} className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"><option value="US">Estados Unidos</option><option value="BR">Brasil</option><option value="PT">Portugal</option><option value="CA">Canadá</option><option value="GB">Reino Unido</option><option value="IE">Irlanda</option></select></label>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Para explorar agora</h2>
            <p className="text-[11px] text-slate-500">Cards compactos, pensados para descoberta rápida</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {groups.length} grupo{groups.length === 1 ? '' : 's'}
          </span>
        </div>

        {loadingInitial ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Nenhum grupo disponível para exibir agora.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
            {groups.map((group: RegionalGroupCard) => {
              const previewMembers = group.memberPreviews.slice(0, 4);
              const missingAvatars = Math.max(group.memberCount - previewMembers.length, 0);

              return (
                <Link
                  key={group.id}
                  href={group.publicPath}
                  className="group flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="relative aspect-[16/11] w-full overflow-hidden rounded-[20px] bg-slate-100">
                    {group.coverImageUrl || group.imageUrl ? (
                      <img src={group.coverImageUrl || group.imageUrl || ''} alt={group.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-brand-100 text-sm font-bold text-brand-500">
                        {getInitials(group.name)}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-slate-900">{group.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                      {group.regionLabel || 'Toda a comunidade'}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                        <UsersRound size={12} className="text-brand-500" />
                        <span>{formatCompactMemberCount(group.memberCount)} membros</span>
                      </div>
                      {group.category ? (
                        <span className="truncate text-[11px] font-medium text-slate-400">{group.category}</span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex items-center">
                      <div className="flex items-center">
                        {previewMembers.map((member, index) => (
                          <div
                            key={member.id}
                            className={`relative h-6 w-6 overflow-hidden rounded-full border-2 border-white bg-slate-100 ${
                              index === 0 ? '' : '-ml-2'
                            }`}
                          >
                            {member.image ? (
                              <img
                                src={member.image}
                                alt={member.name || 'Membro do grupo'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-200 text-[9px] font-bold text-slate-600">
                                {getInitials(member.name || 'Membro')}
                              </div>
                            )}
                          </div>
                        ))}

                        {missingAvatars > 0 ? (
                          <div className="-ml-2 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-brand-100 px-1 text-[9px] font-bold text-brand-500">
                            +{missingAvatars}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            </div>
            {loadingMore ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-center text-xs font-semibold text-slate-500">
                Carregando mais grupos...
              </div>
            ) : null}
            {hasMore ? <div ref={sentinelRef} className="h-1" aria-hidden="true" /> : null}
          </>
        )}
      </section>
      <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
        <h2 className="text-sm font-extrabold text-slate-900">Seus grupos</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Acesse rapidamente as comunidades das quais você participa.</p>
        <div className="mt-4 space-y-2">{myGroups.length ? myGroups.map((group) => <Link key={group.id} href={group.publicPath} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-brand-50"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-100 text-xs font-bold text-brand-600">{group.imageUrl ? <img src={group.imageUrl} alt="" className="h-full w-full object-cover" /> : getInitials(group.name)}</div><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{group.name}</p><p className="truncate text-[10px] text-slate-400">{group.memberCount} membros</p></div></Link>) : <p className="rounded-2xl bg-slate-50 px-3 py-5 text-center text-xs text-slate-500">Você ainda não participa de grupos.</p>}</div>
      </aside>
      </div>
    </ContentColumn>
  );
};

export default GroupsDirectory;

