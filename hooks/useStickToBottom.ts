'use client';

import { useCallback, useEffect, useRef } from 'react';

const NEAR_BOTTOM_PX = 96;

/**
 * Mantém uma lista de mensagens rolada para o fim apenas enquanto a pessoa já está
 * perto do fim — quem está lendo o histórico antigo não é puxado para baixo quando
 * chega uma mensagem nova. `resetKey` (ex.: id da conversa) volta ao fim.
 */
export function useStickToBottom<T extends HTMLElement>(dependency: unknown, resetKey: unknown) {
  const ref = useRef<T | null>(null);
  const stickRef = useRef(true);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = ref.current;
    if (!el) return;
    stickRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [resetKey, scrollToBottom]);

  useEffect(() => {
    if (stickRef.current) scrollToBottom(true);
  }, [dependency, scrollToBottom]);

  return { ref, onScroll, scrollToBottom };
}
