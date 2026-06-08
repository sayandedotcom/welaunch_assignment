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
      <div className={`max-w-xl rounded-[24px] border border-white/[0.06] px-5 py-3 text-[13px] font-medium shadow-sm ${
        isUser 
          ? 'bg-[#1a1a1a] text-zinc-100' 
          : 'bg-[#1a1a1a] text-zinc-300'
      }`}>
        <div className="whitespace-pre-wrap">{content}</div>
        {!isUser && reasoning && <ReasoningStream reasoning={reasoning} />}
      </div>
    </div>
  );
}