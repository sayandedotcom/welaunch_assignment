'use client';

import { ReasoningStream } from './ReasoningStream';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
}

export function ChatMessage({ role, content, reasoning }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-md rounded-2xl px-4 py-3 text-sm leading-relaxed cursor-default ${
        isUser 
          ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' 
          : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
      }`}>
        <div className="whitespace-pre-wrap">{content}</div>
        {!isUser && reasoning && <ReasoningStream reasoning={reasoning} />}
      </div>
    </div>
  );
}