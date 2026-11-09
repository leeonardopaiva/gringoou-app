'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ExternalLink, Loader2, MessageCircle, Send } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { InfoTip } from '@/components/ui/InfoTip';
import { useToast } from '@/components/feedback/ToastProvider';
import { useMessaging } from '@/lib/MessagingProvider';
import { useAdAccount } from '@/components/ads/AdAccountProvider';
import { useStickToBottom } from '@/hooks/useStickToBottom';
import { cn } from '@/lib/cn';

function shortTime(value: string) {
  const date = new Date(value);
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  if (mins < 10080) return `${Math.floor(mins / 1440)}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/** Caixa de entrada do negócio: mensagens que outras pessoas enviaram ao responsável pelo negócio. */
export function BusinessInbox() {
  const { data: session } = useSession();
  const { account } = useAdAccount();
  const searchParams = useSearchParams();
  const requestedConversation = searchParams?.get('conversation') ?? null;
  const me = session?.user?.id ?? '';
  const { showToast } = useToast();
  const { conversations, activeConversationId, messages, loading, selectConversation, sendMessage } = useMessaging();
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const { ref: messagesRef, onScroll, scrollToBottom } = useStickToBottom<HTMLDivElement>(messages, activeConversationId);

  // Recebidas: conversas iniciadas por outras pessoas (a pessoa logada é quem recebe).
  const received = useMemo(
    () => conversations.filter((c) => !c.archived && c.seller.id === me && c.requestStatus !== 'PENDING' && Boolean(account?.businessId) && c.businessId === account?.businessId),
    [conversations, me, account?.businessId],
  );
  const active = received.find((c) => c.id === activeConversationId) ?? null;

  useEffect(() => {
    if (!active && view === 'chat') setView('list');
  }, [active, view]);

  // Vindo de um alerta: abre direto a conversa indicada.
  useEffect(() => {
    if (requestedConversation && received.some((item) => item.id === requestedConversation) && activeConversationId !== requestedConversation) {
      void selectConversation(requestedConversation);
      setView('chat');
    }
  }, [requestedConversation, received, activeConversationId, selectConversation]);

  const open = (id: string) => {
    void selectConversation(id);
    setView('chat');
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !active || sending) return;
    setSending(true);
    setDraft('');
    const error = await sendMessage(text);
    setSending(false);
    if (error) {
      setDraft(text);
      showToast(error, 'error');
    } else {
      scrollToBottom(true);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
          Mensagens
          <InfoTip text="Conversas de pessoas que escreveram para este negócio. Conversas antigas, de antes da separação por negócio, continuam nas mensagens da comunidade. Para bloquear, denunciar ou arquivar, abra a conversa por lá." />
        </h1>
        <Link href="/inbox" className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
          <ExternalLink size={15} /> Mensagens da comunidade
        </Link>
      </div>

      <div className="grid h-[calc(100vh-190px)] min-h-[440px] overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-[320px_1fr]">
        <aside className={cn('min-h-0 flex-col border-slate-100 md:flex md:border-r', view === 'chat' ? 'hidden' : 'flex')}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && received.length === 0 ? (
              <div className="flex items-center justify-center p-10 text-slate-400"><Loader2 className="animate-spin" size={20} /></div>
            ) : received.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center">
                <MessageCircle size={28} className="text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">Nenhuma mensagem ainda</p>
                <p className="text-xs text-slate-400">Quando alguém falar com o seu negócio, a conversa aparece aqui.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {received.map((conv) => {
                  const last = conv.messages[conv.messages.length - 1];
                  return (
                    <li key={conv.id}>
                      <button type="button" onClick={() => open(conv.id)} className={cn('flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50', conv.id === activeConversationId && 'bg-[#0065bf]/5')}>
                        <Avatar src={conv.buyer.image} name={conv.buyer.name ?? 'Pessoa'} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <strong className="truncate text-sm text-slate-900">{conv.buyer.name ?? 'Pessoa'}</strong>
                            <span className="shrink-0 text-[11px] text-slate-400">{shortTime(conv.lastMessageAt ?? conv.updatedAt)}</span>
                          </span>
                          <span className="block truncate text-xs text-slate-500">{conv.item ? `${conv.item.title} · ` : ''}{last?.content ?? 'Sem mensagens'}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className={cn('min-h-0 flex-col md:flex', view === 'chat' ? 'flex' : 'hidden')}>
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center text-slate-400">
              <MessageCircle size={32} className="text-slate-300" />
              <p className="text-sm">Selecione uma conversa para responder.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <button type="button" aria-label="Voltar" onClick={() => setView('list')} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 md:hidden"><ChevronLeft size={18} /></button>
                <Avatar src={active.buyer.image} name={active.buyer.name ?? 'Pessoa'} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{active.buyer.name ?? 'Pessoa'}</p>
                  {active.item ? <p className="truncate text-xs text-slate-400">Sobre: {active.item.title}</p> : null}
                </div>
              </div>
              <div ref={messagesRef} onScroll={onScroll} className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50/60 p-4">
                {messages.map((message) => {
                  const mine = message.senderId === me;
                  return (
                    <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm', mine ? 'bg-[#0065bf] text-white' : 'border border-slate-200 bg-white text-slate-800', message.deleted && 'italic opacity-60')}>
                        {message.deleted ? 'Mensagem apagada' : message.content}
                      </div>
                    </div>
                  );
                })}
              </div>
              <form
                onSubmit={(event) => { event.preventDefault(); void send(); }}
                className="flex items-end gap-2 border-t border-slate-100 p-3"
              >
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }}
                  rows={1}
                  maxLength={2000}
                  placeholder="Escreva uma resposta"
                  className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0065bf]"
                />
                <button type="submit" disabled={!draft.trim() || sending} aria-label="Enviar" className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#0065bf] text-white transition hover:bg-[#004380] disabled:opacity-40">
                  {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
