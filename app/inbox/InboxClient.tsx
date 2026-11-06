'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import type { User } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMessaging, type Conversation as MessagingConversation } from '@/lib/MessagingProvider';
import { MessageCircle, Package, User as UserIconLucide, ChevronLeft, MoreHorizontal, Archive, Bell, Flag, Trash2, X, Send, Loader2 } from 'lucide-react';

// Use the Conversation type from MessagingProvider to avoid conflicts
type Conversation = MessagingConversation;

export const InboxClient: React.FC<{ user: User }> = ({ user }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    conversations,
    activeConversationId,
    messages,
    unreadCount,
    loading,
    selectConversation,
    sendMessage,
    refreshConversations,
    startConversation,
  } = useMessaging();

  const [tab, setTab] = useState<'todas' | 'marketplace' | 'diretas'>('todas');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversationId]);

  // Handle URL conversation parameter
  useEffect(() => {
    const convId = searchParams?.get('conversation');
    if (convId && conversations.some((c) => c.id === convId)) {
      selectConversation(convId);
      setMobileView('chat');
    }
  }, [searchParams, conversations, selectConversation]);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const filtered = conversations.filter((c) =>
    tab === 'marketplace' ? !!c.itemId : tab === 'diretas' ? !c.itemId : true
  );

  const handleSend = useCallback(async () => {
    if (!draft.trim() || !activeConversationId || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft('');
    try {
      await sendMessage(text);
    } finally {
      setSending(false);
    }
  }, [activeConversationId, draft, sendMessage, sending]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const getOtherUser = (conv: Conversation) => {
    const isBuyer = conv.buyer.id === user.id;
    return isBuyer ? conv.seller : conv.buyer;
  };

  const getUnreadCount = (conv: Conversation) => {
    return conv.messages.filter((m) => m.senderId !== user.id).length;
  };

  const handleBack = () => {
    if (window.innerWidth < 768) {
      setMobileView('list');
      router.push('/inbox');
    } else {
      selectConversation('');
    }
  };

  const tabLabels = {
    todas: { label: 'Todas', icon: MessageCircle, count: conversations.length },
    marketplace: { label: 'Marketplace', icon: Package, count: conversations.filter((c) => c.itemId).length },
    diretas: { label: 'Diretas', icon: UserIconLucide, count: conversations.filter((c) => !c.itemId).length },
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Back button - visible on mobile when in chat view, and on desktop when conversation selected */}
            {((window.innerWidth < 768 && mobileView === 'chat') || (window.innerWidth >= 768 && activeConv)) && (
              <button
                type="button"
                onClick={handleBack}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
                aria-label="Voltar"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            <div className="flex-1 flex items-center justify-between gap-4 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 truncate">Caixa de Entrada</h1>

              {/* Desktop tabs */}
              <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                {(['todas', 'marketplace', 'diretas'] as const).map((t) => {
                  const info = tabLabels[t];
                  const Icon = info.icon;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                        tab === t
                          ? 'bg-white text-brand-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                      )}
                    >
                      <Icon size={16} />
                      {info.label}
                      {info.count > 0 && (
                        <span className={cn(
                          'flex h-5 min-w-[18px] items-center justify-center rounded-full text-[10px] font-bold',
                          tab === t ? 'bg-brand-100 text-brand-600' : 'bg-slate-200 text-slate-500'
                        )}>
                          {info.count > 99 ? '99+' : info.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile tabs dropdown or actions */}
            <div className="md:hidden flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTab(tab === 'todas' ? 'marketplace' : tab === 'marketplace' ? 'diretas' : 'todas')}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Alternar aba"
              >
                <MoreHorizontal size={22} />
              </button>
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="md:hidden border-t border-slate-200 mt-2 pt-2">
            <div className="flex overflow-x-auto gap-1 pb-2 -mx-4 px-4">
              {(['todas', 'marketplace', 'diretas'] as const).map((t) => {
                const info = tabLabels[t];
                const Icon = info.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
                        tab === t
                          ? 'bg-brand-50 text-brand-600 border border-brand-200'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                      )}
                  >
                    <Icon size={16} />
                    {info.label}
                    {info.count > 0 && (
                      <span className={cn(
                        'flex h-5 min-w-[18px] items-center justify-center rounded-full text-[10px] font-bold',
                        tab === t ? 'bg-brand-100 text-brand-600' : 'bg-slate-200 text-slate-500'
                      )}>
                        {info.count > 99 ? '99+' : info.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {loading ? (
          /* Loading State */
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
            <div className="h-[500px] rounded-2xl border border-slate-200 bg-white">
              <Skeleton className="h-16 w-full border-b border-slate-200" />
              <div className="p-4 space-y-4">
                <Skeleton className="h-12 w-3/4 rounded-lg" />
                <Skeleton className="h-12 w-1/2 rounded-lg" />
              </div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-3">
              {conversations.map((conv) => {
                const other = getOtherUser(conv);
                const otherName = other.name || 'Membro da comunidade';
                const lastMsg = conv.messages[0];
                return (
                  <Skeleton key={conv.id} className="h-20 w-full rounded-2xl" />
                );
              })}
              {conversations.length === 0 && (
                <>
                  <Skeleton className="h-20 w-full rounded-2xl" />
                  <Skeleton className="h-20 w-full rounded-2xl" />
                </>
              )}
            </div>
            <div className="h-[500px] rounded-2xl border border-slate-200 bg-white flex items-center justify-center">
              <EmptyState
                icon={tab === 'marketplace' ? <Package size={28} /> : tab === 'diretas' ? <UserIconLucide size={28} /> : <MessageCircle size={28} />}
                title={
                  tab === 'marketplace'
                    ? 'Nenhuma conversa do Marketplace'
                    : tab === 'diretas'
                    ? 'Nenhuma conversa direta'
                    : 'Nenhuma conversa por aqui'
                }
                description={
                  tab === 'marketplace'
                    ? 'Quando você envia uma mensagem sobre um anúncio, a conversa aparece aqui — tanto para comprador quanto para vendedor.'
                    : tab === 'diretas'
                    ? 'Conversas diretas com outros membros aparecerão aqui.'
                    : 'Suas conversas aparecerão aqui quando você começar a conversar.'
                }
                action={
                  tab === 'todas' && (
                    <Link
                      href="/marketplace"
                      className="inline-flex items-center rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
                    >
                      Explorar anúncios
                    </Link>
                  )
                }
              />
            </div>
          </div>
        ) : (
          /* Content with Conversations List and Chat Panel */
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            {/* Conversations List */}
            <aside className={cn(
              'flex flex-col gap-2',
              window.innerWidth < 768 && mobileView === 'chat' && 'hidden'
            )}>
              <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
                {filtered.map((conv) => {
                  const other = getOtherUser(conv);
                  const otherName = other.name || 'Membro da comunidade';
                  const lastMsg = conv.messages[0];
                  const convUnread = getUnreadCount(conv);
                  const isActive = conv.id === activeConversationId;

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => {
                        selectConversation(conv.id);
                        if (window.innerWidth < 768) setMobileView('chat');
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left transition-colors',
                        isActive ? 'border-brand-300 bg-brand-50 shadow-sm' : 'border-slate-200 hover:border-brand-200 hover:bg-brand-50/40'
                      )}
                    >
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-100">
                        {other.image ? (
                          <img src={other.image} alt={otherName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-base font-bold text-brand-600">{otherName.slice(0, 1).toUpperCase()}</span>
                        )}
                        {convUnread > 0 && (
                          <span className="absolute -bottom-1 -right-1 flex h-5 min-w-[18px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1">
                            {convUnread > 9 ? '9+' : convUnread}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-medium text-slate-900">{otherName}</p>
                          <p className="shrink-0 text-[10px] text-slate-400">{formatTime(conv.updatedAt)}</p>
                        </div>
                        {conv.item && (
                          <p className="mt-0.5 truncate text-xs text-slate-500 flex items-center gap-1">
                            <Package size={10} className="text-slate-400" />
                            {conv.item.title}
                          </p>
                        )}
                        {lastMsg && (
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            {lastMsg.senderId === user.id ? 'Você: ' : ''}{lastMsg.content}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Chat Panel */}
            <div className="flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {activeConv ? (
                <>
                  {/* Chat Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                      aria-label="Voltar"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100">
                        {activeConv.item ? (
                          <Package size={18} className="text-brand-600" />
                        ) : (
                          <MessageCircle size={18} className="text-brand-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {getOtherUser(activeConv).name || 'Membro da comunidade'}
                        </p>
                        {activeConv.item && (
                          <p className="truncate text-xs text-slate-500">{activeConv.item.title}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowMenu(activeConv.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                        aria-label="Mais opções"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Item Context Bar */}
                  {activeConv.item && (
                    <Link
                      href={activeConv.item.publicPath}
                      className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors"
                    >
                      {activeConv.item.imageUrl ? (
                        <img
                          src={activeConv.item.imageUrl}
                          alt={activeConv.item.title}
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          <Package size={20} className="text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{activeConv.item.title}</p>
                        <p className="truncate text-xs text-slate-500">
                          {activeConv.item.priceCents && !activeConv.item.isFree
                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeConv.item.priceCents / 100)
                            : 'Grátis'}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-brand-600">Ver anúncio</span>
                    </Link>
                  )}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 mb-3">
                          {activeConv.item ? (
                            <Package size={28} className="text-brand-600" />
                          ) : (
                            <MessageCircle size={28} className="text-brand-600" />
                          )}
                        </div>
                        <p className="text-slate-500 text-sm">Nenhuma mensagem ainda</p>
                        <p className="text-slate-400 text-xs mt-1">
                          {activeConv.item
                            ? 'Comece a conversa sobre o anúncio'
                            : 'Envie a primeira mensagem'}
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMine = msg.senderId === user.id;
                        return (
                          <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                            <div
                              className={cn(
                                'max-w-[75%] rounded-2xl px-4 py-2',
                                isMine
                                  ? 'rounded-br-md bg-brand-600 text-white shadow-sm'
                                  : 'rounded-bl-md bg-slate-100 text-slate-900 shadow-sm'
                              )}
                            >
                              <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                              <p
                                className={cn(
                                  'mt-1.5 text-right text-[10px]',
                                  isMine ? 'text-brand-100' : 'text-slate-400'
                                )}
                              >
                                {formatTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="border-t border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-end gap-2">
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            void handleSend();
                          }
                        }}
                        placeholder="Escreva uma mensagem..."
                        rows={1}
                        maxLength={2000}
                        className="flex-1 min-h-[44px] max-h-32 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-300 focus:ring-2 focus:ring-brand-100 placeholder:text-slate-400"
                        aria-label="Mensagem"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSend()}
                        disabled={!draft.trim() || sending}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand-300"
                        aria-label="Enviar mensagem"
                      >
                        {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* No conversation selected */
                <div className="flex flex-1 items-center justify-center p-8">
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                      <MessageCircle size={28} className="text-slate-400" />
                    </div>
                    <p className="text-lg font-medium text-slate-600">Selecione uma conversa</p>
                    <p className="mt-1 text-sm text-slate-400 max-w-xs mx-auto">
                      Escolha uma conversa na lista ao lado para começar a conversar.
                    </p>
                  </div>
                </div>
              )}

              {/* Context Menu */}
              {showMenu && activeConv && (
                <div
                  className="fixed top-20 right-4 z-50 w-56 rounded-xl border border-slate-200 bg-white shadow-xl md:absolute md:top-16 md:right-4"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={() => {
                      // Archive conversation
                      setShowMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    role="menuitem"
                  >
                    <Archive size={16} />
                    Arquivar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Mark as unread
                      setShowMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    role="menuitem"
                  >
                    <Bell size={16} />
                    Marcar como não lida
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Report
                      setShowMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    role="menuitem"
                  >
                    <Flag size={16} />
                    Denunciar
                  </button>
                  <hr className="my-1 border-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      // Delete
                      setShowMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    role="menuitem"
                  >
                    <Trash2 size={16} />
                    Excluir conversa
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Click outside to close menu */}
        <div
          className={showMenu ? 'fixed inset-0 z-40 md:hidden' : 'hidden'}
          onClick={() => setShowMenu(null)}
          aria-hidden="true"
        />
      </main>
    </div>
  );
};

export default InboxClient;