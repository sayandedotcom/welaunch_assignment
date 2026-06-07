'use client';

interface ReasoningStreamProps {
  reasoning: string;
}

export function ReasoningStream({ reasoning }: ReasoningStreamProps) {
  if (!reasoning) return null;

  return (
    <div className="mt-2 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg border-l-2 border-amber-500">
      <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Reasoning</div>
      <div className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{reasoning}</div>
    </div>
  );
}