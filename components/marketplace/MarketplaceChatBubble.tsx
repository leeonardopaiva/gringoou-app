'use client';
import React from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';
import { useMessaging } from '@/lib/MessagingProvider';

export const MarketplaceChatBubble: React.FC<{ user: User | null }> = ({ user }) => {
  const { unreadCount } = useMessaging();
  const router = useRouter();

  if (!user) return null;

  const handleOpenInbox = () => {
    router.push('/inbox');
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60]">
      <button
        type="button"
        onClick={handleOpenInbox}
        aria-label="Abrir caixa de entrada"
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl hover:bg-brand-700 transition-colors"
      >
        <MessageCircle size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};