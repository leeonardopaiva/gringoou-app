'use client';

import React from 'react';
import { useMessaging } from '@/lib/MessagingProvider';

const FloatingChat: React.FC = () => {
  const { conversations, unreadCount, floatingChatOpen, floatingChatMinimized, setFloatingChatOpen } = useMessaging();

  return (
    <div className='fixed bottom-4 right-4 z-50'>
      {floatingChatOpen && (
        <div className='w-96 bg-white rounded-lg shadow-lg'>
          {/* Chat Header */}
          <div className='px-4 py-2 border-b'>Chat</div>

          {/* Chat Messages */}
          <div className='p-4'>Messages</div>

          {/* Chat Input */}
          <div className='p-4 border-t'>Input</div>
        </div>
      )}

      {!floatingChatOpen && (
        <button
          onClick={() => setFloatingChatOpen(true)}
          className='p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors'
        >
          <span>Chat</span>
          {unreadCount > 0 && (
            <span className='absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-2 text-xs'>
              {unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};

export default FloatingChat;