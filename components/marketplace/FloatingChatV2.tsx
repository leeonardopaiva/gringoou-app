'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, X, ChevronLeft, Minimize2, Send, MoreHorizontal, Bell, Archive, Trash2, Flag, User as UserIcon, Package, Mail } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { User as UserType } from '@/types';
import { useMessaging, type Conversation } from '@/lib/MessagingProvider';

export const FloatingChatV2: React.FC<{ user: UserType | null }> = ({ user }) => {
  const {
    conversations,
    activeConversationId,
    messages,
    unreadCount,
    floatingChatOpen,
    floatingChatMinimized,
    selectConversation,
    sendMessage,
    setFloatingChatOpen,
    setFloatingChatMinimized,
    startConversation,
    refreshConversations,
  } = useMessaging();

  const [tab, setTab] = useState<'todas' | 'marketplace' | 'diretas'>('todas');
  const [draft, setDraft] = useState('');
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [showInbox, setShowInbox] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversationId]);

  if (!user) return null;

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const filtered = conversations.filter((c) =>
    tab === 'marketplace' ? !!c.itemId : tab === 'diretas' ? !c.itemId : true
  );

  const handleSend = async () => {
    if (!draft.trim() || !activeConversationId) return;
    const text = draft.trim();
    setDraft('');
    await sendMessage(text);
  };

  const handleStartConversation = (itemId: string, sellerUsername: string | null, defaultMessage?: string) => {
    void startConversation(itemId, sellerUsername, defaultMessage);
  };

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

  const getOtherUser = (conv: typeof conversations[0]) => {
    const isBuyer = conv.buyer.id === user.id;
    return isBuyer ? conv.seller : conv.buyer;
  };

  const getUnreadCount = (conv: Conversation) => {
    return conv.messages.filter((m) => m.senderId !== user.id).length;
  };

  // Minimized state - shows as a pill button at bottom right
  if (floatingChatMinimized && !floatingChatOpen) {
    return (
      <button
        type="button"
        onClick={() => setFloatingChatMinimized(false)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-xl hover:bg-slate-50 transition-colors"
        aria-label="Abrir conversas"
      >
        <MessageCircle size={18} className="text-brand-600" />
        <span>Conversas</span>
        {unreadCount > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  // Closed state - shows as a floating action button
  if (!floatingChatOpen && !floatingChatMinimized) {
    return (
      <button
        type="button"
        onClick={() => {
          setFloatingChatOpen(true);
          setFloatingChatMinimized(false);
        }}
        aria-label="Abrir chat"
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl hover:bg-brand-700 transition-colors focus-visible:ring-4 focus-visible:ring-brand-200"
      >
        <MessageCircle size={26} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-6 min-w-[22px] rounded-full bg-red-500 text-[11px] font-bold text-white flex items-center justify-center px-1.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  // Open state - full chat panel
  return (
    <div
      ref={chatContainerRef}
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end"
      role="dialog"
      aria-label="Conversas do Gringoou"
    >
      <div className="flex w-96 max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
          {activeConv ? (
            <>
              <button
                type="button"
                onClick={() => selectConversation('')}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Voltar à lista de conversas"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100">
                  {activeConv.item ? (
                    <Package size={18} className="text-brand-600" />
                  ) : (
                    <Mail size={18} className="text-brand-600" />
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
                <button
                  type="button"
                  onClick={() => setFloatingChatMinimized(true)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                  aria-label="Minimizar"
                >
                  <Minimize2 size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setFloatingChatOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <MessageCircle size={18} className="text-brand-600" />
                  Mensagens
                </span>
                <button
                  type="button"
                  onClick={() => setShowInbox(true)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                  aria-label="Ver caixa de entrada completa"
                >
                  <MoreHorizontal size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => setFloatingChatMinimized(true)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                  aria-label="Minimizar"
                >
                  <Minimize2 size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setFloatingChatOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Conversation List / Chat Area */}
        {activeConv ? (
          <>
            {/* Item Context Bar */}
            {activeConv.item && (
              <Link
                href={activeConv.item.publicPath}
                className="flex items-center gap-3 border-b bg-white px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors"
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 mb-3">
                    <MessageCircle size={28} className="text-brand-600" />
                  </div>
                  <p className="text-slate-500 text-sm">Nenhuma mensagem ainda</p>
                  <p className="text-slate-400 text-xs mt-1">Comece a conversa sobre o anúncio</p>
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
                            : 'rounded-bl-md bg-white border border-slate-200 text-slate-900 shadow-sm'
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
            <div className="border-t bg-white px-4 py-3">
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
                  disabled={!draft.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand-300"
                  aria-label="Enviar mensagem"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b bg-white">
              {(['todas', 'marketplace', 'diretas'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    'flex-1 py-3 text-sm font-semibold capitalize transition-colors relative',
                    tab === t
                      ? 'text-brand-600'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {t === 'todas' && <MessageCircle size={16} className="inline-block mr-1" />}
                  {t === 'marketplace' && <Package size={16} className="inline-block mr-1" />}
                  {t === 'diretas' && <UserIcon size={16} className="inline-block mr-1" />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto max-h-[500px]">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-3">
                    {tab === 'marketplace' ? (
                      <Package size={28} className="text-slate-400" />
                    ) : tab === 'diretas' ? (
                      <UserIcon size={28} className="text-slate-400" />
                    ) : (
                      <MessageCircle size={28} className="text-slate-400" />
                    )}
                  </div>
                  <p className="text-slate-500 text-sm font-medium">
                    {tab === 'marketplace'
                      ? 'Nenhuma conversa do Marketplace'
                      : tab === 'diretas'
                      ? 'Nenhuma conversa direta'
                      : 'Nenhuma conversa por aqui'}
                  </p>
                  <p className="text-slate-400 text-xs mt-1 max-w-xs">
                    {tab === 'marketplace'
                      ? 'Quando você envia uma mensagem sobre um anúncio, a conversa aparece aqui'
                      : tab === 'diretas'
                      ? 'Conversas diretas com outros membros aparecerão aqui'
                      : 'Suas conversas aparecerão aqui quando você começar a conversar'}
                  </p>
                  {tab === 'todas' && (
                    <Link
                      href="/marketplace"
                      className="mt-4 inline-flex items-center rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                    >
                      Explorar anúncios
                    </Link>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
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
                        onClick={() => selectConversation(conv.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 text-left transition-colors',
                          isActive ? 'bg-brand-50 border-l-2 border-brand-600' : 'hover:bg-slate-50'
                        )}
                      >
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100">
                          {other.image ? (
                            <img src={other.image} alt={otherName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-brand-600">{otherName.slice(0, 1).toUpperCase()}</span>
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
              )}
            </div>

            {/* CTA to Inbox */}
            <div className="border-t bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => setShowInbox(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <MessageCircle size={18} className="text-brand-600" />
                Ver caixa de entrada completa
              </button>
            </div>
          </>
        )}

        {/* Context Menu */}
        {showMenu && activeConv && (
          <div
            className="fixed bottom-20 right-4 z-60 w-56 rounded-xl border border-slate-200 bg-white shadow-xl"
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

      {/* Click outside to close menu */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => setShowMenu(null)}
        aria-hidden="true"
      />
    </div>
  );
};

export default FloatingChatV2;