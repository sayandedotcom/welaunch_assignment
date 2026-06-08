'use client';

import { Brain } from 'lucide-react';

interface ReasoningStreamProps {
  reasoning: string;
}

export function ReasoningStream({ reasoning }: ReasoningStreamProps) {
  if (!reasoning) return null;

  return (
    <div className="mt-3 p-3 bg-[#262626] rounded-xl border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="size-3.5 text-zinc-500" />
        <span className="text-xs font-medium text-zinc-500">Reasoning</span>
      </div>
      <div className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">{reasoning}</div>
    </div>
  );
}