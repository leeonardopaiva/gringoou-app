'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';

export type Conversation = {
  id: string;
  /** Nulo em conversas diretas entre pessoas. */
  itemId: string | null;
  /** A pessoa logada bloqueou o outro participante. */
  blockedByViewer?: boolean;
  /** Arquivada / silenciada pela pessoa logada. */
  archived?: boolean;
  muted?: boolean;
  /** PENDING: o destinatário ainda não aceitou (só quem iniciou a vê). */
  requestStatus?: 'ACCEPTED' | 'PENDING';
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  item: { id: string; title: string; imageUrl: string | null; priceCents: number | null; isFree: boolean; publicPath: string } | null;
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
  /** Apagada pelo autor. */
  deleted?: boolean;
  sender: { id: string; name: string | null; image: string | null };
};

type MessagingContextType = {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  unreadCount: number;
  floatingChatOpen: boolean;
  floatingChatMinimized: boolean;
  /** O chat flutuante está abrindo uma conversa (mostra carregamento). */
  floatingChatOpening: boolean;
  loading: boolean;
  selectConversation: (id: string) => Promise<void>;
  /** Retorna `null` se enviou, ou a mensagem de erro se falhou. */
  sendMessage: (content: string) => Promise<string | null>;
  setFloatingChatOpen: (open: boolean) => void;
  setFloatingChatMinimized: (minimized: boolean) => void;
  refreshConversations: () => Promise<void>;
  /** Retorna `null` se deu certo, ou a mensagem de erro. */
  startConversation: (itemId: string, sellerUsername: string | null, defaultMessage?: string) => Promise<string | null>;
  /** Abre (ou cria) a conversa direta com outra pessoa e leva para a Inbox. Retorna false se falhar. */
  startDirectConversation: (recipientId: string, context?: DirectContext) => void;
  /** Cria/abre a conversa direta, adiciona na lista e seleciona. Retorna o id (ou null se falhar). */
  openDirectConversation: (recipientId: string, context?: DirectContext) => Promise<{ id: string | null; error?: string }>;
  /** Arquivar, silenciar ou excluir (só para mim) uma conversa. Retorna a mensagem de erro, se houver. */
  updateConversationState: (id: string, action: ConversationAction) => Promise<string | null>;
  /** Apaga uma mensagem própria. Retorna a mensagem de erro, se houver. */
  deleteMessage: (messageId: string) => Promise<string | null>;
};

/** Contato por negócio ou evento: sempre permitido, mesmo que a pessoa limite mensagens diretas. */
export type DirectContext = { type: 'business' | 'event'; id: string };
export type ConversationAction = 'archive' | 'unarchive' | 'mute' | 'unmute' | 'delete';

const MessagingContext = createContext<MessagingContextType | null>(null);

export const useMessaging = () => {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error('useMessaging deve ser usado dentro de MessagingProvider');
  return ctx;
};

export const MessagingProvider: React.FC<{ user: User | null; children: React.ReactNode }> = ({ user, children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);
  const [floatingChatMinimized, setFloatingChatMinimized] = useState(false);
  const [floatingChatOpening, setFloatingChatOpening] = useState(false);
  const [loading, setLoading] = useState(true);
  const ablyChannelRef = useRef<any>(null);
  const ablyClientRef = useRef<any>(null);
  const isAblyReady = useRef(false);
  const activeConvRef = useRef(activeConversationId);
  activeConvRef.current = activeConversationId;

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/marketplace/messages', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations);
        setUnreadCount(data.conversations.filter((c: any) => !c.muted && !c.archived && c.messages[0]?.senderId !== user.id).length);
      }
    } catch { /* */ }
  }, [user]);

  const initAbly = useCallback(async () => {
    if (isAblyReady.current || !user) return;
    if (typeof window === 'undefined' || !(window as any).Ably) return;
    try {
      const res = await fetch('/api/marketplace/messages/token', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok || !payload.token) {
        // Token endpoint unavailable (e.g., Ably not configured) - skip realtime
        isAblyReady.current = true; // Mark as "ready" to prevent retries
        return;
      }
      const client = new (window as any).Ably.Realtime({ token: payload.token, clientId: user.id, echoMessages: true });
      ablyClientRef.current = client;
      isAblyReady.current = true;
    } catch { /* */ }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const check = () => {
      if ((window as any).Ably) void initAbly();
      else setTimeout(check, 500);
    };
    check();
  }, [user, initAbly]);

  useEffect(() => {
    if (!activeConversationId || !ablyClientRef.current) return;
    const channel = ablyClientRef.current.channels.get(`marketplace:conversation:${activeConversationId}`);
    ablyChannelRef.current = channel;
    const onMessage = (event: { name: string; data?: ChatMessage }) => {
      if (event.name === 'message-deleted' && event.data) {
        setMessages((prev) => prev.map((m) => (m.id === event.data!.id ? { ...m, content: '', deleted: true } : m)));
        return;
      }
      if (event.name !== 'new-message' || !event.data) return;
      setMessages((prev) => (prev.some((m) => m.id === event.data!.id) ? prev : [...prev, event.data!]));
      void refreshConversations();
    };
    channel.subscribe(onMessage);
    return () => { channel.unsubscribe(onMessage); ablyChannelRef.current = null; };
  }, [activeConversationId, refreshConversations]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    void refreshConversations().finally(() => setLoading(false));
  }, [user, refreshConversations]);

  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => void refreshConversations(), 15000);
    return () => clearInterval(timer);
  }, [user, refreshConversations]);

  const selectConversation = useCallback(async (id: string) => {
    setActiveConversationId(id);
    setFloatingChatMinimized(false);
    try {
      const res = await fetch(`/api/marketplace/messages/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) return;
      setMessages(data.messages);
    } catch { /* */ }
  }, []);

  const sendMessage = useCallback(async (content: string): Promise<string | null> => {
    if (!activeConversationId || !content.trim()) return null;
    const text = content.trim();
    try {
      const res = await fetch(`/api/marketplace/messages/${activeConversationId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return data?.error ?? 'Não foi possível enviar a mensagem.';
      setMessages((prev) => [...prev, data.message]);
      void refreshConversations();
      return null;
    } catch {
      return 'Não foi possível enviar a mensagem. Verifique sua conexão.';
    }
  }, [activeConversationId, refreshConversations]);

  /** Chat flutuante só existe no desktop (lg+) e fora da própria Inbox; no celular a Inbox é a tela de conversa. */
  const canUseFloatingChat = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 1024px)').matches &&
    !window.location.pathname.startsWith('/inbox');

  /** Mostra a conversa: no chat flutuante (desktop) ou na Inbox (celular / já dentro da Inbox). */
  const showConversation = useCallback(async (conversationId: string) => {
    if (canUseFloatingChat()) {
      setFloatingChatOpen(true);
      await selectConversation(conversationId);
    } else {
      router.push(`/inbox?conversation=${conversationId}`);
    }
  }, [router, selectConversation]);

  const startConversation = useCallback(async (itemId: string, _sellerUsername: string | null, defaultMessage?: string): Promise<string | null> => {
    if (!user) return 'Entre na sua conta para enviar mensagens.';
    try {
      const res = await fetch('/api/marketplace/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId, content: defaultMessage || 'Olá! Tenho interesse no anúncio.' }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok || res.status === 409) {
        await refreshConversations();
        if (data?.conversationId) await showConversation(data.conversationId);
        else router.push('/inbox');
        return null;
      }
      return data?.error ?? 'Não foi possível iniciar a conversa.';
    } catch {
      return 'Não foi possível iniciar a conversa. Verifique sua conexão.';
    }
  }, [user, refreshConversations, showConversation, router]);

  const openDirectConversation = useCallback(async (recipientId: string, context?: DirectContext): Promise<{ id: string | null; error?: string }> => {
    if (!user) return { id: null, error: 'Entre na sua conta para enviar mensagens.' };
    try {
      const res = await fetch('/api/marketplace/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ recipientId, context }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.conversationId) return { id: null, error: data?.error ?? 'Não foi possível abrir a conversa agora.' };
      // A API já devolve a conversa pronta: entra na lista sem precisar recarregá-la.
      if (data.conversation) {
        setConversations((prev) => [data.conversation, ...prev.filter((c) => c.id !== data.conversation.id)]);
      }
      return { id: data.conversationId as string };
    } catch {
      return { id: null, error: 'Não foi possível abrir a conversa. Verifique sua conexão.' };
    }
  }, [user]);

  /**
   * "Enviar mensagem" em qualquer tela: no desktop abre o chat flutuante já na conversa
   * (a Inbox só abre se a pessoa clicar em "Abrir na Inbox"); no celular leva à Inbox na hora.
   */
  const startDirectConversation = useCallback((recipientId: string, context?: DirectContext) => {
    const contextQuery = context ? `&ctx=${context.type}:${encodeURIComponent(context.id)}` : '';
    if (!canUseFloatingChat()) {
      router.push(`/inbox?to=${encodeURIComponent(recipientId)}${contextQuery}`);
      return;
    }
    setFloatingChatOpen(true);
    setActiveConversationId(null);
    setFloatingChatOpening(true);
    void openDirectConversation(recipientId, context).then(async ({ id: conversationId }) => {
      if (conversationId) await selectConversation(conversationId);
      setFloatingChatOpening(false);
      // Falhou: a Inbox repete a tentativa e mostra o motivo.
      if (!conversationId) router.push(`/inbox?to=${encodeURIComponent(recipientId)}${contextQuery}`);
    });
  }, [openDirectConversation, selectConversation, router]);

  const updateConversationState = useCallback(async (id: string, action: ConversationAction): Promise<string | null> => {
    try {
      const res = await fetch(`/api/marketplace/messages/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return data?.error ?? 'Não foi possível concluir a ação.';
      }
      // Atualiza a lista na hora, sem esperar a próxima leitura.
      setConversations((prev) =>
        action === 'delete'
          ? prev.filter((c) => c.id !== id)
          : prev.map((c) => {
              if (c.id !== id) return c;
              if (action === 'archive') return { ...c, archived: true };
              if (action === 'unarchive') return { ...c, archived: false };
              if (action === 'mute') return { ...c, muted: true };
              return { ...c, muted: false };
            }),
      );
      if (action === 'delete' || action === 'archive') {
        setActiveConversationId((current) => (current === id ? null : current));
      }
      void refreshConversations();
      return null;
    } catch {
      return 'Não foi possível concluir a ação. Verifique sua conexão.';
    }
  }, [refreshConversations]);

  const deleteMessage = useCallback(async (messageId: string): Promise<string | null> => {
    if (!activeConversationId) return null;
    try {
      const res = await fetch(`/api/marketplace/messages/${activeConversationId}?messageId=${encodeURIComponent(messageId)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return data?.error ?? 'Não foi possível apagar a mensagem.';
      }
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content: '', deleted: true } : m)));
      return null;
    } catch {
      return 'Não foi possível apagar a mensagem. Verifique sua conexão.';
    }
  }, [activeConversationId]);

  const value: MessagingContextType = {
    conversations, activeConversationId, messages, unreadCount,
    floatingChatOpen, floatingChatMinimized, floatingChatOpening, loading,
    selectConversation, sendMessage,
    setFloatingChatOpen, setFloatingChatMinimized, refreshConversations, startConversation, startDirectConversation, openDirectConversation,
    updateConversationState, deleteMessage,
  };

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
};
