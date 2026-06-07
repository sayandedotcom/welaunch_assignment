'use client';

import { useChat } from '@/context/ChatContext';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useEffect, useRef } from 'react';

export function ChatBlock() {
  const { currentChat, messages, sendMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Select or create a chat to start messaging
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b bg-white dark:bg-zinc-900">
        <h3 className="font-semibold">{currentChat.title}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-zinc-400 mt-8">
            Start a conversation...
          </div>
        )}
        {messages.map(msg => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} reasoning={msg.reasoning} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSend={sendMessage} disabled={!currentChat} />
    </div>
  );
}