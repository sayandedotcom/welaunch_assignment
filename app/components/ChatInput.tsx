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
    <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border-t border-zinc-800">
      <input
        value={message}
        onChange={e => setMessage(e.target.value)}
        disabled={disabled}
        className="flex-1 bg-zinc-800 text-zinc-100 text-sm px-4 py-2.5 rounded-xl border border-zinc-700 focus:outline-none focus:border-zinc-600 placeholder-zinc-500"
        placeholder={placeholder}
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="flex items-center justify-center size-10 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors border border-zinc-700"
      >
        <SendHorizontal className="size-5" />
      </button>
    </form>
  );
}