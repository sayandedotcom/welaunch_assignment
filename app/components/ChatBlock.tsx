'use client';

import { useChat } from '@/context/ChatContext';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useEffect, useRef, useCallback } from 'react';

export function ChatBlock() {
  const { currentChat, messages, sendMessage } = useChat();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    autoScrollRef.current = isNearBottom;
  }, []);

  useEffect(() => {
    if (autoScrollRef.current && scrollContainerRef.current) {
      requestAnimationFrame(() => {
        const el = scrollContainerRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [messages]);

  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        Select or create a chat to start messaging
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#131313]">
      <div className="flex-1 overflow-hidden">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-[#2a2a2a] scrollbar-track-transparent scrollbar-thumb-rounded-full"
        >
          <div className="px-4 pt-6 pb-4">
            <div className="mx-auto max-w-5xl space-y-6">
              {messages.length === 0 && (
                <div className="text-center text-zinc-500 text-sm mt-8">
                  Start a conversation...
                </div>
              )}
              {messages.map(msg => (
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} reasoning={msg.reasoning} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <ChatInput onSend={sendMessage} disabled={!currentChat} placeholder="Type a message..." />
    </div>
  );
}