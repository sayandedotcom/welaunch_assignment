'use client';

import { useState } from 'react';
import { SendHorizontal } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = 'Type a message...' }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;
    onSend(message);
    setMessage('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border-t border-white/[0.06]">
      <input
        value={message}
        onChange={e => setMessage(e.target.value)}
        disabled={disabled}
        className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
        placeholder={placeholder}
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="flex items-center justify-center size-8 rounded-full bg-white/[0.08] text-zinc-300 hover:bg-white/[0.12] disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        <SendHorizontal className="size-4" />
      </button>
    </form>
  );
}