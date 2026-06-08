'use client';

interface ReasoningStreamProps {
  reasoning: string;
}

export function ReasoningStream({ reasoning }: ReasoningStreamProps) {
  if (!reasoning) return null;

  return (
    <div className="mt-3 p-3 bg-[#262626] rounded-xl border border-white/[0.06]">
      <div className="text-xs font-medium text-zinc-400 mb-2">Reasoning</div>
      <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{reasoning}</div>
    </div>
  );
}