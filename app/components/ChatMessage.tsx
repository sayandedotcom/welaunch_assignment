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
      <div className={`max-w-xl rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm cursor-default ${
        isUser 
          ? 'bg-[#1a1a1a] text-zinc-100 border border-white/5' 
          : 'bg-[#1a1a1a] text-zinc-300 border border-white/5'
      }`}>
        <div className="whitespace-pre-wrap">{content}</div>
        {!isUser && reasoning && <ReasoningStream reasoning={reasoning} />}
      </div>
    </div>
  );
}