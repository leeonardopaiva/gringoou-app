'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, X } from 'lucide-react';
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
        className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-surface text-foreground transition hover:bg-brand-100"
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
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[80] w-[320px] max-w-[calc(100vw-2rem)] rounded-card border border-border bg-surface p-2 text-left shadow-md">
          <div className="px-2 py-2">
            <p className="text-sm font-bold text-slate-900">{adminMode ? 'Notificações' : 'Solicitações'}</p>
            <p className="text-xs text-slate-400">{adminMode ? 'Pendências da comunidade e da sua conta.' : 'Conexões pendentes da comunidade.'}</p>
          </div>

          <div className="max-h-[360px] space-y-1.5 overflow-y-auto">
            {loading && notificationCount === 0 ? (
              <div className="rounded-xl px-4 py-5 text-center text-sm font-medium text-slate-500">
                Carregando...
              </div>
            ) : notificationCount === 0 ? (
              <div className="rounded-xl px-4 py-5 text-center text-sm font-medium text-slate-500">
                Nenhuma solicitação pendente.
              </div>
            ) : (
              <>
              {requests.map((request) => {
                const requesterName = request.requester.name || 'Usuario da comunidade';

                return (
                  <div key={request.id} className="rounded-xl border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={request.requester.username ? `/${request.requester.username}` : '/'}
                        onClick={() => setOpen(false)}
                        className="shrink-0"
                      >
                        <Avatar src={request.requester.image} name={requesterName} size="lg" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{requesterName}</p>
                        <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          @{request.requester.username || 'perfil'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        variant="primary"
                        size="xs"
                        iconLeft={<Check size={14} />}
                        disabled={processingId === request.id}
                        onClick={() => void handleDecision(request.id, 'accept')}
                      >
                        Aceitar
                      </Button>
                      <Button
                        variant="secondary"
                        size="xs"
                        iconLeft={<X size={14} />}
                        disabled={processingId === request.id}
                        onClick={() => void handleDecision(request.id, 'decline')}
                      >
                        Recusar
                      </Button>
                    </div>
                  </div>
                );
              })}
              {pendingPosts.map((post) => {
                const authorName = post.author.name || 'Usuario da comunidade';

                return (
                  <div key={post.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={post.author.image} name={authorName} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">Post aguardando aprovacao</p>
                        <p className="truncate text-xs text-slate-500">{authorName} em {post.locationLabel}</p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-700">{post.content}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        variant="primary"
                        size="xs"
                        iconLeft={<Check size={14} />}
                        disabled={processingId === post.id}
                        onClick={() => void handlePostDecision(post.id, 'approve')}
                      >
                        Aprovar
                      </Button>
                      <Button
                        variant="secondary"
                        size="xs"
                        iconLeft={<X size={14} />}
                        disabled={processingId === post.id}
                        onClick={() => void handlePostDecision(post.id, 'remove')}
                      >
                        Recusar
                      </Button>
                    </div>
                  </div>
                );
              })}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FriendRequestBell;
