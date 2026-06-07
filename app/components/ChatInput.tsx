'use client';

import { useState } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;
    onSend(message);
    setMessage('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t bg-card">
      <input
        value={message}
        onChange={e => setMessage(e.target.value)}
        disabled={disabled}
        className="flex-1 px-4 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Type your message..."
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:bg-primary/80"
      >
        Send
      </button>
    </form>
  );
}