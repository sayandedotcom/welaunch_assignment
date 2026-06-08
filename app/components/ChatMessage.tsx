'use client';

import { ReasoningStream } from './ReasoningStream';
import { CheckCircle2, Globe2, Search } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  webSearchActive?: boolean;
  webSearchQuery?: string;
  webSearchResults?: string[];
}

export function ChatMessage({
  role,
  content,
  reasoning,
  webSearchActive,
  webSearchQuery,
  webSearchResults,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const hasSearchResults = Boolean(webSearchResults?.length);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-md rounded-2xl px-4 py-3 text-sm leading-relaxed cursor-default ${
        isUser 
          ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' 
          : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
      }`}>
        {!isUser && (webSearchActive || hasSearchResults) && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
            {webSearchActive ? (
              <Search className="mt-0.5 size-3.5 shrink-0 text-sky-400 animate-pulse" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-medium text-zinc-300">
                <Globe2 className="size-3" />
                {webSearchActive ? 'Searching live web' : 'Live web results used'}
              </div>
              {webSearchQuery && (
                <div className="mt-0.5 truncate text-zinc-500">{webSearchQuery}</div>
              )}
            </div>
          </div>
        )}
        <div className="whitespace-pre-wrap">{content}</div>
        {!isUser && reasoning && <ReasoningStream reasoning={reasoning} />}
      </div>
    </div>
  );
}
