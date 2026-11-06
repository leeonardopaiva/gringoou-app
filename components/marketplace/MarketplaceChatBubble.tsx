'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Minus, Send, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { User } from '@/types';
import { useMessaging } from '@/lib/MessagingProvider';

export const MarketplaceChatBubble: React.FC<{ user: User | null }> = ({ user }) => {
  const { conversations, activeConversationId, messages, unreadCount, floatingChatOpen, floatingChatMinimized, selectConversation, sendMessage, setFloatingChatOpen, setFloatingChatMinimized } = useMessaging();
  const [tab, setTab] = useState<'todas' | 'mensagens' | 'marketplace'>('todas');
  const [draft, setDraft] = useState('');

  if (!user) return null;
  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const filtered = conversations.filter((c) => (tab === 'marketplace' ? !!c.itemId : tab === 'mensagens' ? !c.itemId : true));

  const handleSend = async () => {
    if (!draft.trim()) return;
    const text = draft;
    setDraft('');
    await sendMessage(text);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end">
      {floatingChatOpen && !floatingChatMinimized ? (
        <div className="flex h-[460px] w-88 max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl sm:w-96">
          <div className="flex items-center justify-between border-b bg-slate-50 px-3 py-2">
            {activeConv ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void selectConversation('')} className="p-1 text-slate-400 hover:text-slate-600"><ArrowLeft size={16} /></button>
                <span className="truncate text-xs font-bold">{activeConv.seller.id === user.id ? activeConv.buyer.name : activeConv.seller.name}</span>
              </div>
            ) : (
              <span className="text-xs font-bold flex items-center gap-1.5"><MessageCircle size={16} className="text-brand-600" /> Mensagens</span>
            )}
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setFloatingChatMinimized(true)} className="p-1 text-slate-400 hover:text-slate-600"><Minus size={14} /></button>
              <button type="button" onClick={() => setFloatingChatOpen(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={14} /></button>
            </div>
          </div>
          {activeConv ? (
            <div className="flex flex-1 flex-col overflow-hidden bg-slate-50/50">
              {activeConv.item && (
                <div className="flex items-center justify-between border-b bg-white px-3 py-1 text-[11px]">
                  <span className="truncate font-medium">{activeConv.item.title}</span>
                  <Link href={`/marketplace/${activeConv.item.id}`} className="text-brand-600 font-bold ml-2">Ver</Link>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={cn('flex flex-col', m.senderId === user.id ? 'items-end' : 'items-start')}>
                    <div className={cn('max-w-[85%] rounded-2xl px-3 py-1.5 text-xs', m.senderId === user.id ? 'bg-brand-600 text-white' : 'bg-white border text-slate-800')}>{m.content}</div>
                  </div>
                ))}
              </div>
              <div className="border-t bg-white p-2 flex items-center gap-1.5">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleSend(); } }} placeholder="Escreva..." className="flex-1 text-xs px-2.5 py-1.5 border rounded-lg outline-none" />
                <button type="button" onClick={() => void handleSend()} disabled={!draft.trim()} className="p-2 bg-brand-600 text-white rounded-lg disabled:opacity-40"><Send size={13} /></button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex border-b bg-white text-xs">
                {(['todas', 'marketplace', 'mensagens'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)} className={cn('flex-1 py-1.5 font-semibold capitalize', tab === t ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-400')}>{t}</button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-8">Nenhuma conversa.</p>
                ) : (
                  filtered.map((c) => (
                    <button key={c.id} type="button" onClick={() => void selectConversation(c.id)} className="w-full text-left p-2 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                      <span className="h-7 w-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">{(c.seller.id === user.id ? c.buyer.name : c.seller.name)?.[0]?.toUpperCase()}</span>
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-bold text-slate-800 truncate">{c.seller.id === user.id ? c.buyer.name : c.seller.name}</p>
                        <p className="text-slate-400 truncate">{c.messages[0]?.content}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : floatingChatMinimized ? (
        <button type="button" onClick={() => setFloatingChatMinimized(false)} className="flex items-center gap-2 rounded-full border bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-xl">
          <MessageCircle size={15} className="text-brand-600" /> Conversas {unreadCount > 0 && `(${unreadCount})`}
        </button>
      ) : (
        <button type="button" onClick={() => { setFloatingChatOpen(true); setFloatingChatMinimized(false); }} aria-label="Abrir chat" className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl hover:bg-brand-700">
          <MessageCircle size={22} />
          {unreadCount > 0 && <span className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1">{unreadCount}</span>}
        </button>
      )}
    </div>
  );
};