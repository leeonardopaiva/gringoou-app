'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, X } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from './ToastProvider';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

type PendingFriendRequest = {
  id: string;
  createdAt: string;
  requester: {
    id: string;
    name?: string | null;
    username?: string | null;
    image?: string | null;
    locationLabel?: string | null;
  };
};

type PendingCommunityPost = {
  id: string;
  content: string;
  createdAt: string;
  locationLabel: string;
  author: {
    id: string;
    name?: string | null;
    username?: string | null;
    image?: string | null;
  };
};

const FriendRequestBell: React.FC<{ adminMode?: boolean }> = ({ adminMode = false }) => {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<PendingFriendRequest[]>([]);
  const [pendingPosts, setPendingPosts] = useState<PendingCommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);

    try {
      const [friendResponse, postResponse] = await Promise.all([
        fetch('/api/friends/requests', { cache: 'no-store' }),
        fetch('/api/admin/community/posts', { cache: 'no-store' }),
      ]);
      const payload = await friendResponse.json().catch(() => null);

      if (!friendResponse.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel carregar solicitacoes.');
      }

      setRequests(Array.isArray(payload?.requests) ? payload.requests : []);

      if (postResponse.ok) {
        const postPayload = await postResponse.json().catch(() => null);
        setPendingPosts(Array.isArray(postPayload?.posts) ? postPayload.posts : []);
      } else {
        setPendingPosts([]);
      }
    } catch (error) {
      console.error('Failed to load friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostDecision = async (postId: string, action: 'approve' | 'remove') => {
    setProcessingId(postId);

    try {
      const response = await fetch(`/api/admin/community/posts/${postId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel revisar a publicacao.');
      }

      setPendingPosts((current) => current.filter((post) => post.id !== postId));
      showToast(action === 'approve' ? 'Publicacao aprovada.' : 'Publicacao recusada.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Nao foi possivel revisar a publicacao.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const notificationCount = requests.length + pendingPosts.length;

  useEffect(() => {
    void loadRequests();
    const intervalId = window.setInterval(() => void loadRequests(), 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleDecision = async (requestId: string, action: 'accept' | 'decline') => {
    setProcessingId(requestId);

    try {
      const response = await fetch(`/api/friends/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Nao foi possivel responder a solicitacao.');
      }

      setRequests((current) => current.filter((request) => request.id !== requestId));
      showToast(payload?.message ?? 'Solicitacao respondida.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Nao foi possivel responder a solicitacao.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface text-foreground transition hover:bg-brand-100"
        aria-label={adminMode ? 'Notificacoes administrativas' : 'Solicitacoes de amizade'}
      >
        <Bell size={18} />
        {notificationCount > 0 ? (
          <Badge
            tone="erro"
            count={notificationCount > 9 ? '9+' : notificationCount}
            className="absolute -right-1 -top-1 ring-2 ring-white"
          />
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[80] w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-border bg-surface text-left shadow-md">
          <div className="max-h-[420px] overflow-y-auto">
            {loading && notificationCount === 0 ? (
              <div className="flex justify-center px-4 py-8" role="status" aria-label="Carregando notificações">
                <Spinner size="sm" />
              </div>
            ) : notificationCount === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Bell size={20} aria-hidden />
                </span>
                <p className="text-sm font-medium text-slate-500">Nada novo por aqui</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {requests.map((request) => {
                  const requesterName = request.requester.name || 'Usuario da comunidade';

                  return (
                    <li key={request.id} className="flex items-center gap-3 px-4 py-3.5">
                      <Link
                        href={request.requester.username ? `/${request.requester.username}` : '/'}
                        onClick={() => setOpen(false)}
                        className="shrink-0"
                      >
                        <Avatar src={request.requester.image} name={requesterName} size="lg" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{requesterName}</p>
                        <p className="truncate text-xs text-slate-500">quer se conectar com você</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={`Aceitar ${requesterName}`}
                          disabled={processingId === request.id}
                          onClick={() => void handleDecision(request.id, 'accept')}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white transition hover:brightness-105 disabled:opacity-50"
                        >
                          <Check size={16} aria-hidden />
                        </button>
                        <button
                          type="button"
                          aria-label={`Recusar ${requesterName}`}
                          disabled={processingId === request.id}
                          onClick={() => void handleDecision(request.id, 'decline')}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          <X size={16} aria-hidden />
                        </button>
                      </div>
                    </li>
                  );
                })}
                {pendingPosts.map((post) => {
                  const authorName = post.author.name || 'Usuario da comunidade';

                  return (
                    <li key={post.id} className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar src={post.author.image} name={authorName} size="lg" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{authorName}</p>
                          <p className="truncate text-xs text-slate-500">publicação aguardando aprovação · {post.locationLabel}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            aria-label="Aprovar publicação"
                            disabled={processingId === post.id}
                            onClick={() => void handlePostDecision(post.id, 'approve')}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white transition hover:brightness-105 disabled:opacity-50"
                          >
                            <Check size={16} aria-hidden />
                          </button>
                          <button
                            type="button"
                            aria-label="Recusar publicação"
                            disabled={processingId === post.id}
                            onClick={() => void handlePostDecision(post.id, 'remove')}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            <X size={16} aria-hidden />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 pl-[3.25rem] text-xs leading-5 text-slate-600">{post.content}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FriendRequestBell;
