'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import type { User } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';

type Conversation = {
  id: string;
  itemId: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  item: { id: string; title: string; imageUrl: string | null; priceCents: number | null; isFree: boolean; publicPath: string };
  buyer: { id: string; name: string | null; image: string | null; username: string | null };
  seller: { id: string; name: string | null; image: string | null; username: string | null };
  messages: Array<{ id: string; content: string; senderId: string; createdAt: string }>;
};

type ChatMessage = {
  id: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  sender: { id: string; name: string | null; image: string | null };
};

const MarketplaceChat: React.FC<{ user: User }> = ({ user }) => {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const ablyClientRef = useRef<any>(null);
  const subscribeRef = useRef<(() => void) | null>(null);
  const { showToast } = useToast();

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/marketplace/messages', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setConversations(data.conversations);
    } catch {
      /* ignora */
    } finally {
      setLoading(false);
    }
  }, []);

  const selectConversation = useCallback(
    async (conversationId: string) => {
      setActiveConversationId(conversationId);
      setMessages([]);
      try {
        const res = await fetch(`/api/marketplace/messages/${conversationId}`, { cache: 'no-store' });
        const data = await res.json();
        if (res.ok) setMessages(data.messages);
      } catch {
        showToast('Erro ao carregar mensagens.', 'error');
      }
    },
    [showToast],
  );

  const sendMessage = useCallback(async () => {
    if (!draft.trim() || !activeConversationId) return;
    setSending(true);
    const content = draft.trim();
    setDraft('');
    try {
      const res = await fetch(`/api/marketplace/messages/${activeConversationId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, data.message]);
        void loadConversations();
      } else {
        showToast(data.error || 'Erro ao enviar.', 'error');
        setDraft(content);
      }
    } catch {
      showToast('Erro de conexão.', 'error');
      setDraft(content);
    } finally {
      setSending(false);
    }
  }, [activeConversationId, draft, loadConversations, showToast]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // Polling: recarrega mensagens da conversa ativa a cada 5s.
  useEffect(() => {
    if (!activeConversationId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/marketplace/messages/${activeConversationId}`, { cache: 'no-store' });
        const data = await res.json();
        if (res.ok) {
          setMessages(data.messages);
        }
      } catch {
        /* poll falhou, mantém mensagens atuais */
      }
    };

    poll();
    const timer = setInterval(poll, 5000);
    return () => clearInterval(timer);
  }, [activeConversationId]);

  // Seleciona conversa vinda de ?conversation=...
  useEffect(() => {
    const id = searchParams?.get('conversation');
    if (id) void selectConversation(id);
  }, [searchParams, selectConversation]);

  return (
    <div className="mx-auto w-full max-w-[880px] px-5 pb-24 pt-2">
      <header className="flex min-h-12 items-center gap-2">
        <Link href="/marketplace" aria-label="Voltar ao marketplace" className="flex h-9 w-9 items-center justify-center rounded-full text-brand-600 transition hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-200">
          &#8592;
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Mensagens do Marketplace</h1>
      </header>

      {loading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-lg font-bold text-text">Nenhuma conversa por aqui</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">Quando você envia uma mensagem sobre um anúncio, a conversa aparece aqui — tanto para comprador quanto para vendedor.</p>
          <Link href="/marketplace" className="mt-5 inline-flex items-center rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-105">
            Explorar anúncios
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Lista de conversas */}
          <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
            {conversations.map((conv) => {
              const isBuyer = conv.buyer.id === user.id;
              const other = isBuyer ? conv.seller : conv.buyer;
              const otherName = other.name || 'Membro da comunidade';
              const lastMsg = conv.messages[0];
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => selectConversation(conv.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left transition',
                    conv.id === activeConversationId ? 'border-brand-300 bg-brand-50' : 'border-slate-200 hover:border-brand-200 hover:bg-brand-50/40'
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-base font-bold text-brand-600">
                    {other.image ? <img src={other.image} alt={otherName} className="h-full w-full object-cover" /> : otherName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">{otherName}</span>
                      <span className="shrink-0 text-[10px] text-slate-400">{conv.updatedAt ? new Date(conv.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''}</span>
                    </span>
                    <span className="block truncate text-xs text-slate-500 flex items-center gap-1">
                      <span className="text-slate-400" aria-hidden="true">📦</span>
                      {conv.item.title}
                    </span>
                    {lastMsg ? <span className="mt-0.5 block truncate text-[11px] text-slate-400">{lastMsg.senderId === user.id ? 'Você: ' : ''}{lastMsg.content}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Painel de mensagens */}
          <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {activeConversationId ? (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 bg-white">
                  {messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">Nenhuma mensagem ainda. Converse sobre o item.</p>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.senderId === user.id;
                      return (
                        <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                          <div className={cn('max-w-[80%] rounded-2xl px-3 py-2', isMine ? 'rounded-br-sm bg-brand-600 text-white shadow-sm' : 'rounded-bl-sm bg-slate-100 text-slate-900 shadow-sm')}>
                            <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                            <p className={cn('mt-0.5 text-right text-[10px]', isMine ? 'text-brand-100' : 'text-slate-400')}>
                              {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={(el) => el?.scrollIntoView({ block: 'end' })} />
                </div>
                <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-3">
                  <input
                    type="text"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') void sendMessage(); }}
                    placeholder="Escreva uma mensagem..."
                    maxLength={1000}
                    className="h-11 flex-1 rounded-full border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={!draft.trim() || sending}
                    aria-label="Enviar mensagem"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
                  >
                    {sending ? '...' : '&#10148;'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-slate-400">Selecione uma conversa para começar.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceChat;