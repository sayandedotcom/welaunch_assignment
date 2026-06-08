'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  webSearchActive?: boolean;
  webSearchQuery?: string;
  webSearchResults?: string[];
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
  const [currentChat, setCurrentChatState] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const loadChatMessages = useCallback(async (chatId: string) => {
    const res = await fetch(`/api/chats/${chatId}`);
    const data = await res.json();
    setMessages(data.map((m: { id: string; role: string; content: string; reasoning?: string }) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      reasoning: m.reasoning,
    })));
  }, []);

  const setCurrentChat = useCallback((c: Chat) => {
    setCurrentChatState(c);
    loadChatMessages(c.id);
  }, [loadChatMessages]);

  const refreshChats = useCallback(async (workspaceId: string) => {
    const res = await fetch(`/api/chats?workspaceId=${workspaceId}`);
    const data = await res.json();
    setChats(data);
    setCurrentChatState(prev => {
      if (prev?.workspaceId === workspaceId) return prev;
      setMessages([]);
      return null;
    });
  }, []);

  const createChat = async (workspaceId: string) => {
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId }),
    });
    const chat = await res.json();
    setChats([chat, ...chats]);
    setCurrentChatState(chat);
    setMessages([]);
  };

  const deleteChat = async (id: string) => {
    await fetch(`/api/chats/${id}`, { method: 'DELETE' });
    setChats(chats.filter(c => c.id !== id));
    if (currentChat?.id === id) {
      setCurrentChatState(null);
      setMessages([]);
    }
  };

  const sendMessage = async (content: string) => {
    if (!currentChat) return;

    const userMsgId = `temp-user-${Date.now()}`;
    const userMsg: Message = { id: userMsgId, role: 'user', content };
    const assistantMsgId = `temp-assistant-${Date.now()}`;
    const assistantMsg: Message = { id: assistantMsgId, role: 'assistant', content: '' };
    setMessages(prev => [...prev, userMsg, assistantMsg]);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: currentChat.id,
        message: content,
        workspaceId: currentChat.workspaceId,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Message failed' }));
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId ? { ...m, content: error.error || 'Message failed' } : m
      ));
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId ? { ...m, content: 'No response stream was returned.' } : m
      ));
      return;
    }

    const decoder = new TextDecoder();
    let reasoningBuffer = '';
    let answerBuffer = '';
    let streamBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      streamBuffer += decoder.decode(value, { stream: true });
      const parts = streamBuffer.split('\n\n');
      streamBuffer = parts.pop() || '';

      for (const part of parts) {
        const line = part.split('\n').find(l => l.startsWith('data: '));
        if (!line) continue;

        try {
          const data = JSON.parse(line.replace('data: ', ''));
          if (data.type === 'reasoning') {
            reasoningBuffer = data.content;
            setMessages(prev => prev.map(m =>
              m.id === assistantMsgId ? { ...m, reasoning: reasoningBuffer } : m
            ));
          } else if (data.type === 'answer') {
            answerBuffer = data.content;
            setMessages(prev => prev.map(m =>
              m.id === assistantMsgId ? { ...m, content: answerBuffer } : m
            ));
          } else if (data.type === 'tool') {
            setMessages(prev => prev.map(m =>
              m.id === assistantMsgId ? { ...m, webSearchActive: true, webSearchQuery: data.input } : m
            ));
          } else if (data.type === 'tool_result') {
            setMessages(prev => prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, webSearchResults: [...(m.webSearchResults || []), data.result] }
                : m
            ));
          } else if (data.type === 'done') {
            setMessages(prev => prev.map(m =>
              m.id === assistantMsgId ? { ...m, id: data.messageId, webSearchActive: false } : m
            ));
          }
        } catch (e) {
          console.error('SSE JSON parse error:', e);
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
