'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@/types';

export type Conversation = {
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

type MessagingContextType = {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  unreadCount: number;
  floatingChatOpen: boolean;
  floatingChatMinimized: boolean;
  loading: boolean;
  selectConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  setFloatingChatOpen: (open: boolean) => void;
  setFloatingChatMinimized: (minimized: boolean) => void;
  refreshConversations: () => Promise<void>;
  startConversation: (itemId: string, sellerUsername: string | null, defaultMessage?: string) => Promise<void>;
};

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
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);
  const [floatingChatMinimized, setFloatingChatMinimized] = useState(false);
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
        setUnreadCount(data.conversations.filter((c: any) => c.messages[0]?.senderId !== user.id).length);
      }
    } catch { /* */ }
  }, [user]);

  const initAbly = useCallback(async () => {
    if (isAblyReady.current || !user) return;
    if (typeof window === 'undefined' || !(window as any).Ably) return;
    try {
      const res = await fetch('/api/marketplace/messages/token', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok || !payload.token) return;
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

  const sendMessage = useCallback(async (content: string) => {
    if (!activeConversationId || !content.trim()) return;
    const text = content.trim();
    try {
      const res = await fetch(`/api/marketplace/messages/${activeConversationId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (res.ok) { setMessages((prev) => [...prev, data.message]); void refreshConversations(); }
    } catch { /* */ }
  }, [activeConversationId, refreshConversations]);

  const startConversation = useCallback(async (itemId: string, _sellerUsername: string | null, defaultMessage?: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/marketplace/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId, content: defaultMessage || 'Olá! Tenho interesse no anúncio.' }),
      });
      const data = await res.json();
      if (res.ok || res.status === 409) {
        await refreshConversations();
        setFloatingChatOpen(true);
        if (data.conversationId) await selectConversation(data.conversationId);
      }
    } catch { /* */ }
  }, [user, refreshConversations, selectConversation]);

  const value: MessagingContextType = {
    conversations, activeConversationId, messages, unreadCount,
    floatingChatOpen, floatingChatMinimized, loading,
    selectConversation, sendMessage,
    setFloatingChatOpen, setFloatingChatMinimized, refreshConversations, startConversation,
  };

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
};
