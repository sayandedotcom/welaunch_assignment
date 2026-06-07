'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
}

interface Chat {
  id: string;
  workspaceId: string;
  title: string;
}

interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  setCurrentChat: (c: Chat) => void;
  createChat: (workspaceId: string) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  refreshChats: (workspaceId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const refreshChats = async (workspaceId: string) => {
    const res = await fetch(`/api/chats?workspaceId=${workspaceId}`);
    setChats(await res.json());
  };

  const loadMessages = async (chatId: string) => {
    const res = await fetch(`/api/chats/${chatId}`);
    setMessages(await res.json());
  };

  const createChat = async (workspaceId: string) => {
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId }),
    });
    const chat = await res.json();
    setChats([chat, ...chats]);
    setCurrentChat(chat);
    setMessages([]);
  };

  const deleteChat = async (id: string) => {
    await fetch(`/api/chats/${id}`, { method: 'DELETE' });
    setChats(chats.filter(c => c.id !== id));
    if (currentChat?.id === id) {
      setCurrentChat(null);
      setMessages([]);
    }
  };

  const sendMessage = async (content: string) => {
    if (!currentChat) return;

    const userMsg: Message = { id: 'temp-user', role: 'user', content };
    setMessages(prev => [...prev, userMsg]);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: currentChat.id,
        message: content,
        workspaceId: currentChat.workspaceId,
      }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let reasoningBuffer = '';
    let answerBuffer = '';

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const data = JSON.parse(line.replace('data: ', ''));
        if (data.type === 'reasoning') {
          reasoningBuffer = data.content;
          setMessages(prev => prev.map(m =>
            m.id === 'temp-user' ? { ...m, reasoning: reasoningBuffer } : m
          ));
        } else if (data.type === 'answer') {
          answerBuffer = data.content;
          setMessages(prev => prev.map(m =>
            m.id === 'temp-user' ? { ...m, content: answerBuffer } : m
          ));
        }
      }
    }
  };

  return (
    <ChatContext.Provider value={{
      chats, currentChat, messages, setCurrentChat,
      createChat, deleteChat, sendMessage, refreshChats,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext)!;