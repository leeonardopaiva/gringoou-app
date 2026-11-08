'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import type { User } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import PageHeader from '@/components/navigation/PageHeader';
import { goBackOr } from '@/lib/navigation-history';
import { useStickToBottom } from '@/hooks/useStickToBottom';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMessaging, type Conversation as MessagingConversation } from '@/lib/MessagingProvider';
import { useToast } from '@/components/feedback/ToastProvider';
import { MessageCircle, Package, User as UserIconLucide, ChevronLeft, MoreHorizontal, Ban, Flag, Send, Loader2, Archive, ArchiveRestore, BellOff, Bell, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

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
    openDirectConversation,
    updateConversationState,
    deleteMessage,
  } = useMessaging();
  const { showToast } = useToast();
  const directTarget = searchParams?.get('to') ?? null;
  const openedDirectRef = useRef<string | null>(null);
  const [openingDirect, setOpeningDirect] = useState(Boolean(directTarget));

  const [tab, setTab] = useState<'todas' | 'marketplace' | 'diretas' | 'arquivadas'>('todas');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [isMobile, setIsMobile] = useState(false);
  const refreshedForRef = useRef<string | null>(null);
  const { ref: messagesRef, onScroll: onMessagesScroll, scrollToBottom } = useStickToBottom<HTMLDivElement>(
    messages,
    activeConversationId,
  );

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Abre a conversa direta pedida por "?to=<pessoa>": a navegação é imediata e a conversa abre aqui.
  useEffect(() => {
    if (!directTarget || openedDirectRef.current === directTarget) return;
    openedDirectRef.current = directTarget;
    setOpeningDirect(true);
    const rawContext = searchParams?.get('ctx') ?? '';
    const [contextType, contextId] = rawContext.split(':');
    const context = (contextType === 'business' || contextType === 'event') && contextId ? { type: contextType as 'business' | 'event', id: contextId } : undefined;
    void openDirectConversation(directTarget, context).then(({ id: conversationId, error }) => {
      setOpeningDirect(false);
      if (conversationId) {
        router.replace(`/inbox?conversation=${conversationId}`);
      } else {
        showToast(error ?? 'Não foi possível abrir a conversa agora. Tente novamente.', 'error');
        router.replace('/inbox');
      }
    });
  }, [directTarget, openDirectConversation, router, searchParams, showToast]);

  // Handle URL conversation parameter (conversa recém-criada pode ainda não estar na lista)
  useEffect(() => {
    const convId = searchParams?.get('conversation');
    if (!convId) {
      setMobileView('list');
      return;
    }
    if (conversations.some((c) => c.id === convId)) {
      if (activeConversationId !== convId) void selectConversation(convId);
      setMobileView('chat');
    } else if (!loading && refreshedForRef.current !== convId) {
      refreshedForRef.current = convId;
      void refreshConversations();
    }
  }, [searchParams, conversations, selectConversation, refreshConversations, activeConversationId, loading]);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const visibleConversations = conversations.filter((c) => !c.archived);
  const archivedConversations = conversations.filter((c) => c.archived);
  const filtered =
    tab === 'arquivadas'
      ? archivedConversations
      : visibleConversations.filter((c) => (tab === 'marketplace' ? !!c.itemId : tab === 'diretas' ? !c.itemId : true));
  const menuConv = showMenu ? conversations.find((c) => c.id === showMenu) ?? null : null;

  const runConversationAction = async (conv: Conversation, action: 'archive' | 'unarchive' | 'mute' | 'unmute' | 'delete') => {
    setActionBusy(true);
    const error = await updateConversationState(conv.id, action);
    setActionBusy(false);
    setShowMenu(null);
    setDeleteTarget(null);
    if (error) {
      showToast(error, 'error');
      return;
    }
    if (action === 'delete' || action === 'archive') {
      if (isMobile) {
        setMobileView('list');
        router.replace('/inbox');
      }
      showToast(action === 'delete' ? 'Conversa excluída.' : 'Conversa arquivada.', 'success');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const error = await deleteMessage(messageId);
    if (error) showToast(error, 'error');
  };

  const REPORT_REASONS = [
    { id: 'SPAM', label: 'Spam ou propaganda' },
    { id: 'HARASSMENT', label: 'Assédio ou ofensas' },
    { id: 'SCAM', label: 'Golpe ou fraude' },
    { id: 'INAPPROPRIATE', label: 'Conteúdo impróprio' },
    { id: 'OTHER', label: 'Outro motivo' },
  ];

  const toggleBlock = async (conv: Conversation) => {
    const other = conv.buyer.id === user.id ? conv.seller : conv.buyer;
    const unblock = Boolean(conv.blockedByViewer);
    setBlockBusy(true);
    try {
      const response = await fetch(unblock ? `/api/blocks?userId=${encodeURIComponent(other.id)}` : '/api/blocks', {
        method: unblock ? 'DELETE' : 'POST',
        headers: { 'content-type': 'application/json' },
        ...(unblock ? {} : { body: JSON.stringify({ userId: other.id }) }),
      });
      if (!response.ok) throw new Error();
      showToast(unblock ? 'Pessoa desbloqueada.' : 'Pessoa bloqueada. Vocês não trocam mais mensagens.', 'success');
      await refreshConversations();
    } catch {
      showToast('Não foi possível concluir agora. Tente novamente.', 'error');
    } finally {
      setBlockBusy(false);
      setShowMenu(null);
    }
  };

  const submitReport = async () => {
    if (!activeConversationId || !reportReason || reportSending) return;
    setReportSending(true);
    try {
      const response = await fetch('/api/reports/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId: activeConversationId, reason: reportReason, details: reportDetails.trim() || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível enviar a denúncia.');
      showToast('Denúncia enviada. Nossa equipe vai analisar.', 'success');
      setReportOpen(false);
      setReportReason('');
      setReportDetails('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível enviar a denúncia.', 'error');
    } finally {
      setReportSending(false);
    }
  };

  const handleSend = useCallback(async () => {
    if (!draft.trim() || !activeConversationId || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft('');
    try {
      const sendError = await sendMessage(text);
      if (sendError) {
        setDraft(text);
        showToast(sendError, 'error');
      } else {
        scrollToBottom(true);
      }
    } finally {
      setSending(false);
    }
  }, [activeConversationId, draft, scrollToBottom, sendMessage, sending, showToast]);

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

  /** Sai da Inbox: volta para a tela de onde veio; em acesso direto, cai na Comunidade. */
  const exitInbox = () => goBackOr(router, '/community');

  const handleBack = () => {
    if (isMobile && mobileView === 'chat') {
      setMobileView('list');
      router.push('/inbox');
    } else {
      exitInbox();
    }
  };

  const tabLabels = {
    todas: { label: 'Todas', icon: MessageCircle, count: visibleConversations.length },
    marketplace: { label: 'Marketplace', icon: Package, count: visibleConversations.filter((c) => c.itemId).length },
    diretas: { label: 'Pessoas', icon: UserIconLucide, count: visibleConversations.filter((c) => !c.itemId).length },
    arquivadas: { label: 'Arquivadas', icon: Archive, count: archivedConversations.length },
  };

  const renderTabs = (variant: 'desktop' | 'mobile') => (
    <div
      className={cn(
        'flex items-center gap-2',
        variant === 'mobile' && 'overflow-x-auto pb-2',
      )}
      role="tablist"
      aria-label="Filtrar conversas"
    >
      {(['todas', 'marketplace', 'diretas', 'arquivadas'] as const).filter((t) => t !== 'arquivadas' || archivedConversations.length > 0 || tab === 'arquivadas').map((t) => {
        const info = tabLabels[t];
        const Icon = info.icon;
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
              tab === t
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            <Icon size={16} />
            {info.label}
            {info.count > 0 && (
              <span
                className={cn(
                  'flex h-5 min-w-[18px] items-center justify-center rounded-full text-[10px] font-bold',
                  tab === t ? 'bg-white/25 text-white' : 'bg-white text-slate-500',
                )}
              >
                {info.count > 99 ? '99+' : info.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto max-w-[1120px] px-4 py-1">
          <PageHeader
            title="INBOX"
            titleClassName="text-brand-600"
            backHref="/community"
            onBack={handleBack}
            action={<div className="hidden md:block">{renderTabs('desktop')}</div>}
          />
          <div className="md:hidden">{renderTabs('mobile')}</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1120px] px-4 py-6">
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
        ) : filtered.length === 0 && !openingDirect ? (
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
                    ? 'Nenhuma conversa com pessoas'
                    : 'Nenhuma conversa por aqui'
                }
                description={
                  tab === 'marketplace'
                    ? 'Quando você envia uma mensagem sobre um anúncio, a conversa aparece aqui — tanto para comprador quanto para vendedor.'
                    : tab === 'diretas'
                    ? 'Para conversar com alguém, abra o perfil da pessoa e toque em "Enviar mensagem".'
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
              isMobile && mobileView === 'chat' && 'hidden'
            )}>
              <div className="flex max-h-[calc(100dvh-12rem)] flex-col gap-2 overflow-y-auto pr-1">
                {filtered.map((conv) => {
                  const other = getOtherUser(conv);
                  const otherName = other.name || 'Membro da comunidade';
                  const lastMsg = conv.messages[0];
                  const convUnread = getUnreadCount(conv);
                  const isActive = conv.id === activeConversationId;

                  return (
                    <div
                      key={conv.id}
                      className={cn(
                        'relative flex w-full items-center rounded-2xl border bg-white transition-colors',
                        isActive ? 'border-brand-300 bg-brand-50 shadow-sm' : 'border-slate-200 hover:border-brand-200 hover:bg-brand-50/40'
                      )}
                    >
                    <button
                      type="button"
                      onClick={() => {
                        if (isMobile) {
                          router.push(`/inbox?conversation=${conv.id}`);
                        } else {
                          void selectConversation(conv.id);
                        }
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
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
                          <p className="flex min-w-0 items-center gap-1.5 truncate font-medium text-slate-900">
                            <span className="truncate">{otherName}</span>
                            {conv.muted ? <BellOff size={12} className="shrink-0 text-slate-400" aria-label="Silenciada" /> : null}
                          </p>
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
                    <button
                      type="button"
                      onClick={() => setShowMenu(conv.id)}
                      className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      aria-label={`Opções da conversa com ${otherName}`}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    </div>
                  );
                })}
                {filtered.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-slate-400">
                    {tab === 'arquivadas' ? 'Nenhuma conversa arquivada.' : 'Nenhuma conversa por aqui.'}
                  </p>
                ) : null}
              </div>
            </aside>

            {/* Chat Panel */}
            <div className={cn('relative flex h-[calc(100dvh-9rem)] min-h-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:h-[70vh]', isMobile && mobileView !== 'chat' && 'hidden')}>
              {openingDirect && !activeConv ? (
                <div className="flex flex-1 flex-col" role="status" aria-label="Abrindo conversa">
                  <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <div className="flex flex-1 items-center justify-center">
                    <Loader2 size={22} className="animate-spin text-brand-500" aria-hidden />
                  </div>
                </div>
              ) : activeConv ? (
                <>
                  {/* Chat Header */}
                  <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="mr-1 inline-flex h-10 shrink-0 items-center gap-0.5 rounded-full pl-1 pr-3 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 md:hidden"
                      aria-label="Voltar para as conversas"
                    >
                      <ChevronLeft size={22} />
                      Conversas
                    </button>
                    <div className="flex-1 min-w-0">
                      {(() => {
                        const other = getOtherUser(activeConv);
                        const otherName = other.name || 'Membro da comunidade';
                        const headerContent = (
                          <>
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100">
                              {other.image ? (
                                <img src={other.image} alt={otherName} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold text-brand-600">{otherName.slice(0, 1).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{otherName}</p>
                              {activeConv.item ? (
                                <p className="truncate text-xs text-slate-500">{activeConv.item.title}</p>
                              ) : other.username ? (
                                <p className="truncate text-xs text-slate-500">@{other.username}</p>
                              ) : null}
                            </div>
                          </>
                        );
                        // Avatar e nome levam ao perfil público da pessoa.
                        return other.username ? (
                          <Link
                            href={`/${other.username}`}
                            aria-label={`Ver perfil de ${otherName}`}
                            className="flex min-w-0 items-center gap-3 rounded-xl transition hover:opacity-80"
                          >
                            {headerContent}
                          </Link>
                        ) : (
                          <div className="flex min-w-0 items-center gap-3">{headerContent}</div>
                        );
                      })()}
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
                  <div ref={messagesRef} onScroll={onMessagesScroll} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-white p-4">
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
                              {msg.deleted ? (
                                <p className={cn('text-sm italic', isMine ? 'text-brand-100' : 'text-slate-400')}>Mensagem apagada</p>
                              ) : (
                                <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                              )}
                              <p
                                className={cn(
                                  'mt-1.5 flex items-center justify-end gap-2 text-[10px]',
                                  isMine ? 'text-brand-100' : 'text-slate-400'
                                )}
                              >
                                {isMine && !msg.deleted && Date.now() - new Date(msg.createdAt).getTime() < 15 * 60 * 1000 ? (
                                  <button type="button" onClick={() => void handleDeleteMessage(msg.id)} className="font-semibold underline-offset-2 hover:underline" aria-label="Apagar mensagem">
                                    Apagar
                                  </button>
                                ) : null}
                                {formatTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input Area */}
                  {activeConv.blockedByViewer ? (
                    <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-center text-sm text-slate-500">
                      Você bloqueou esta pessoa.{' '}
                      <button type="button" onClick={() => void toggleBlock(activeConv)} disabled={blockBusy} className="font-semibold text-brand-600 hover:underline disabled:opacity-50">
                        Desbloquear
                      </button>
                    </div>
                  ) : (
                  <div className="shrink-0 border-t border-slate-200 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                    {activeConv.requestStatus === 'PENDING' && activeConv.buyer.id === user.id ? (
                      <p className="mb-2 text-center text-xs text-slate-500">Sua mensagem foi enviada. A pessoa precisa aceitar para vocês conversarem.</p>
                    ) : null}
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
                  )}
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

            </div>
          </div>
        )}

        {menuConv ? (
          <>
            <div className="fixed inset-0 z-[70] bg-slate-950/30 md:bg-transparent" onClick={() => setShowMenu(null)} aria-hidden="true" />
            <div
              className="fixed inset-x-0 bottom-0 z-[75] rounded-t-2xl border border-slate-200 bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-xl md:inset-x-auto md:bottom-auto md:right-8 md:top-28 md:w-60 md:rounded-xl"
              role="menu"
            >
              {(() => {
                const itemClass = 'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50';
                return (
                  <>
                    <button type="button" role="menuitem" disabled={actionBusy} onClick={() => void runConversationAction(menuConv, menuConv.archived ? 'unarchive' : 'archive')} className={itemClass}>
                      {menuConv.archived ? <ArchiveRestore size={17} /> : <Archive size={17} />}
                      {menuConv.archived ? 'Desarquivar' : 'Arquivar'}
                    </button>
                    <button type="button" role="menuitem" disabled={actionBusy} onClick={() => void runConversationAction(menuConv, menuConv.muted ? 'unmute' : 'mute')} className={itemClass}>
                      {menuConv.muted ? <Bell size={17} /> : <BellOff size={17} />}
                      {menuConv.muted ? 'Reativar notificações' : 'Silenciar'}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowMenu(null);
                        void selectConversation(menuConv.id);
                        setReportOpen(true);
                      }}
                      className={itemClass}
                    >
                      <Flag size={17} />
                      Denunciar
                    </button>
                    <hr className="my-1 border-slate-100" />
                    <button type="button" role="menuitem" disabled={blockBusy} onClick={() => void toggleBlock(menuConv)} className={cn(itemClass, 'text-red-600 hover:bg-red-50')}>
                      <Ban size={17} />
                      {menuConv.blockedByViewer ? 'Desbloquear pessoa' : 'Bloquear pessoa'}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setDeleteTarget(menuConv.id);
                        setShowMenu(null);
                      }}
                      className={cn(itemClass, 'text-red-600 hover:bg-red-50')}
                    >
                      <Trash2 size={17} />
                      Excluir conversa
                    </button>
                  </>
                );
              })()}
            </div>
          </>
        ) : null}

        <Modal
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Excluir conversa?"
          description="Ela some da sua lista, mas a outra pessoa continua vendo. Se ela escrever de novo, a conversa volta com o histórico."
          className="max-w-md"
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => {
                  const target = conversations.find((c) => c.id === deleteTarget);
                  if (target) void runConversationAction(target, 'delete');
                }}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          }
        >
          <span className="sr-only">Confirmação</span>
        </Modal>

        <Modal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          title="Denunciar conversa"
          description="Conte o que aconteceu. Nossa equipe analisa e a outra pessoa não é avisada."
          className="max-w-md"
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReportOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submitReport()}
                disabled={!reportReason || reportSending}
                className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reportSending ? 'Enviando...' : 'Enviar denúncia'}
              </button>
            </div>
          }
        >
          <fieldset className="space-y-2">
            <legend className="sr-only">Motivo da denúncia</legend>
            {REPORT_REASONS.map((reason) => (
              <label key={reason.id} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition', reportReason === reason.id ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}>
                <input type="radio" name="report-reason" value={reason.id} checked={reportReason === reason.id} onChange={() => setReportReason(reason.id)} className="accent-brand-600" />
                {reason.label}
              </label>
            ))}
          </fieldset>
          <textarea
            value={reportDetails}
            onChange={(event) => setReportDetails(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Detalhes (opcional)"
            aria-label="Detalhes da denúncia"
            className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
        </Modal>

      </main>
    </div>
  );
};

export default InboxClient;