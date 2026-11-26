'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, ChevronLeft, ChevronUp, ChevronDown, Send, Package, Mail, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { User } from '@/types';
import { useMessaging } from '@/lib/MessagingProvider';
import { useStickToBottom } from '@/hooks/useStickToBottom';
import { useLanguage } from '@/components/i18n/LanguageProvider';

const formatTime = (dateString: string) => {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

/**
 * Chat flutuante (somente desktop). Começa minimizado como uma barra compacta
 * "Mensagens"; o mesmo controle abre e recolhe. No mobile a Inbox é acessada pelo
 * item "Mensagens" do menu inferior.
 */
export const MarketplaceChatBubble: React.FC<{ user: User | null }> = ({ user }) => {
  const { tx } = useLanguage();
  const {
    conversations,
    activeConversationId,
    messages,
    unreadCount,
    floatingChatOpen,
    floatingChatOpening,
    selectConversation,
    sendMessage,
    setFloatingChatOpen,
  } = useMessaging();

  const [tab, setTab] = useState<'todas' | 'marketplace' | 'diretas'>('todas');
  const [draft, setDraft] = useState('');
  const { ref: messagesRef, onScroll, scrollToBottom } = useStickToBottom<HTMLDivElement>(messages, activeConversationId);

  if (!user) return null;

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const filtered = conversations.filter((c) => (tab === 'marketplace' ? !!c.itemId : tab === 'diretas' ? !c.itemId : true));
  const getOtherUser = (conv: (typeof conversations)[0]) => (conv.buyer.id === user.id ? conv.seller : conv.buyer);
  const getUnread = (conv: (typeof conversations)[0]) => conv.messages.filter((m) => m.senderId !== user.id).length;

  const handleSend = async () => {
    if (!draft.trim() || !activeConversationId) return;
    const text = draft.trim();
    setDraft('');
    await sendMessage(text);
    scrollToBottom(true);
  };

  const unreadBadge =
    unreadCount > 0 ? (
      <span
        className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
        aria-label={`${unreadCount} ${tx('mensagens novas')}`}
      >
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    ) : null;

  // Minimizado: barra compacta.
  if (!floatingChatOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-[60] hidden lg:block">
        <button
          type="button"
          onClick={() => setFloatingChatOpen(true)}
          aria-expanded={false}
          aria-label={unreadCount > 0 ? `${tx('Abrir mensagens,')} ${unreadCount} ${tx('novas')}` : tx('Abrir mensagens')}
          className="flex h-12 w-60 items-center gap-2.5 rounded-2xl border border-slate-200 bg-surface px-4 text-sm font-semibold text-slate-800 shadow-lg transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <MessageCircle size={18} className="text-brand-600" aria-hidden />
          <span className="flex-1 text-left">{tx('Mensagens')}</span>
          {unreadBadge}
          <ChevronUp size={18} className="text-slate-400" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[60] hidden lg:block">
      <div
        className="flex h-[min(560px,calc(100dvh-6rem))] w-96 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-2xl"
        role="dialog"
        aria-label={tx('Mensagens')}
      >
        {/* Header: o controle de recolher é o mesmo que abriu o chat. */}
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-surface px-3 py-2.5">
          {activeConv ? (
            <>
              <button
                type="button"
                onClick={() => void selectConversation('')}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label={tx('Voltar à lista de conversas')}
              >
                <ChevronLeft size={20} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{getOtherUser(activeConv).name || tx('Membro da comunidade')}</p>
                {activeConv.item ? <p className="truncate text-xs text-slate-500">{activeConv.item.title}</p> : null}
              </div>
            </>
          ) : (
            <span className="flex min-w-0 flex-1 items-center gap-2 pl-1 text-sm font-semibold text-slate-900">
              <MessageCircle size={18} className="text-brand-600" aria-hidden />
              {tx('Mensagens')}
              {unreadBadge}
            </span>
          )}
          <Link
            href={activeConv ? `/inbox?conversation=${activeConv.id}` : '/inbox'}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50"
            aria-label={tx('Abrir na Inbox')}
            title={tx('Abrir na Inbox')}
          >
            <ExternalLink size={14} aria-hidden />
            {tx('Inbox')}
          </Link>
          <button
            type="button"
            onClick={() => setFloatingChatOpen(false)}
            aria-expanded
            aria-label={tx('Recolher mensagens')}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <ChevronDown size={20} />
          </button>
        </div>

        {floatingChatOpening && !activeConv ? (
          <div className="flex flex-1 items-center justify-center" role="status" aria-label={tx('Abrindo conversa')}>
            <Loader2 size={22} className="animate-spin text-brand-500" aria-hidden />
          </div>
        ) : activeConv ? (
          <>
            {activeConv.item ? (
              <Link
                href={activeConv.item.publicPath}
                className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-surface px-4 py-2.5 text-sm transition-colors hover:bg-slate-50"
              >
                {activeConv.item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeConv.item.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <Package size={18} className="text-slate-400" />
                  </div>
                )}
                <p className="min-w-0 flex-1 truncate font-medium text-slate-900">{activeConv.item.title}</p>
                <span className="text-xs font-medium text-brand-600">{tx('Ver anúncio')}</span>
              </Link>
            ) : null}

            <div ref={messagesRef} onScroll={onScroll} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
              {messages.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-400">{tx('Nenhuma mensagem ainda')}</p>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === user.id;
                  return (
                    <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-2 shadow-sm',
                          isMine ? 'rounded-br-md bg-brand-strong text-white' : 'rounded-bl-md bg-slate-100 text-slate-900',
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                        <p className={cn('mt-1 text-right text-[10px]', isMine ? 'text-white/85' : 'text-slate-400')}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-surface px-4 py-3">
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
                  placeholder={tx('Escreva uma mensagem...')}
                  rows={1}
                  maxLength={2000}
                  className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200 bg-surface px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                  aria-label={tx('Mensagem')}
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!draft.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-strong text-white shadow-sm transition-colors hover:bg-brand-strong-hover focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={tx('Enviar mensagem')}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex shrink-0 border-b border-slate-200 bg-surface" role="tablist" aria-label={tx('Filtrar conversas')}>
              {(['todas', 'marketplace', 'diretas'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'flex-1 py-2.5 text-sm font-semibold transition-colors',
                    tab === t ? 'text-brand-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600',
                  )}
                >
                  {t === 'todas' ? tx('Todas') : t === 'marketplace' ? tx('Marketplace') : tx('Diretas')}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {filtered.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    {tab === 'diretas' ? <Mail size={24} className="text-slate-400" /> : <Package size={24} className="text-slate-400" />}
                  </div>
                  <p className="text-sm font-medium text-slate-500">{tx('Nenhuma conversa por aqui')}</p>
                  <p className="mt-1 max-w-xs text-xs text-slate-400">{tx('Suas conversas aparecerão aqui quando você começar a conversar.')}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filtered.map((conv) => {
                    const other = getOtherUser(conv);
                    const otherName = other.name || 'Membro da comunidade';
                    const lastMsg = conv.messages[0];
                    const convUnread = getUnread(conv);
                    return (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => void selectConversation(conv.id)}
                        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100">
                          {other.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={other.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-brand-600">{otherName.slice(0, 1).toUpperCase()}</span>
                          )}
                          {convUnread > 0 ? <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" aria-hidden /> : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-slate-900">{otherName}</p>
                            <p className="shrink-0 text-[10px] text-slate-400">{formatTime(conv.updatedAt)}</p>
                          </div>
                          {conv.item ? <p className="mt-0.5 truncate text-xs text-slate-500">{conv.item.title}</p> : null}
                          {lastMsg ? (
                            <p className="mt-0.5 truncate text-[11px] text-slate-400">
                              {lastMsg.senderId === user.id ? `${tx('Você:')} ` : ''}
                              {lastMsg.content}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
