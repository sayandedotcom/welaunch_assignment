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
      <div className={`max-w-[70%] rounded-lg p-3 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
        <div className="whitespace-pre-wrap">{content}</div>
        {!isUser && reasoning && <ReasoningStream reasoning={reasoning} />}
      </div>
    </div>
  );
}