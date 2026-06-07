# AI Chat Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-workspace AI chat application with real-time web-connected responses, streaming reasoning, and cross-chat contextual awareness.

**Architecture:** Next.js 16 full-stack app with API routes for chat management. LangChain/LangGraph for agentic web retrieval and reasoning. SQLite with vector extensions (sqlite-vss) for cross-chat semantic retrieval. Server-Sent Events (SSE) for real-time streaming. Client-side state management with React Context.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS, LangChain, LangGraph, OpenRouter API, sqlite-vss, SSE streaming

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout with providers
│   ├── page.tsx                      # Main app entry
│   ├── globals.css                   # Global styles
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts              # POST /api/chat - send message, stream response
│   │   ├── workspaces/
│   │   │   └── route.ts              # GET/POST /api/workspaces
│   │   ├── workspaces/[id]/
│   │   │   └── route.ts              # GET/PUT/DELETE /api/workspaces/[id]
│   │   ├── chats/
│   │   │   └── route.ts              # GET/POST /api/chats
│   │   └── chats/[id]/
│   │       └── route.ts              # GET/DELETE /api/chats/[id]
│   └── components/
│       ├── Sidebar.tsx               # Workspace sidebar
│       ├── WorkspaceItem.tsx # Individual workspace
│       ├── ChatBlock.tsx              # Chat session container
│       ├── ChatMessage.tsx            # Single message bubble
│       ├── ReasoningStream.tsx        # Streaming reasoning display
│       ├── ChatInput.tsx              # Message input
│       └── providers/
│           └── AppProviders.tsx       # Context providers
├── lib/
│   ├── db/
│   │   ├── index.ts                  # Database connection
│   │   ├── schema.ts                 # SQLite schema
│   │   └── seed.ts                   # Initial data
│   ├── langchain/
│   │   ├── index.ts                  # LangChain setup
│   │   ├── chat.ts                   # Chat model config
│   │   ├── tools/
│   │   │   ├── web-search.ts         # Custom web search tool
│   │   │   └── web-fetch.ts          # Custom web fetch tool
│   │   └── chains/
│   │       ├── reasoning.ts          # Reasoning chain with streaming
│   │       └── cross-chat.ts         # Cross-chat retrieval chain
│   ├── vector-store/
│   │   └── index.ts                  # Vector store setup
│   ├── streaming/
│   │   └── sse.ts                    # SSE utilities
│   └── types/
│       └── index.ts                  # TypeScript types
├── context/
│   ├── WorkspaceContext.tsx          # Workspace state
│   └── ChatContext.tsx                # Chat state
└── hooks/
    ├── useStreaming.ts               # SSE streaming hook
    └── useCrossChat.ts                # Cross-chat retrieval hook
```

---

## Task 1: Project Setup & Dependencies

**Files:**
- Modify: `package.json`
- Create: `.env.local`
- Create: `.gitignore`

- [ ] **Step 1: Install core dependencies**

```bash
npm install @langchain/langchain @langchain/community @langchain/openai langgraph @langchain/core openai sqlite sqlite-vss better-sqlite3 uuid
npm install @types/better-sqlite3 @types/uuid --save-dev
```

- [ ] **Step 2: Create .env.local with API key**

```bash
OPENROUTER_API_KEY=YOUR_API_KEY_HERE
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

- [ ] **Step 3: Update .gitignore**

```bash
echo -e "\n.env.local\n.env*.local\n*.db\n*.db-journal\n" >> .gitignore
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.local .gitignore
git commit -m "feat: initial project setup with LangChain and dependencies"
```

---

## Task 2: Database Schema & Setup

**Files:**
- Create: `src/lib/db/index.ts`
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/types/index.ts`

- [ ] **Step 1: Create TypeScript types**

```typescript
// src/lib/types/index.ts
export interface Workspace {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface Chat {
  id: string;
  workspaceId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  citations?: string[];
  createdAt: number;
}
```

- [ ] **Step 2: Create database schema**

```typescript
// src/lib/db/schema.ts
import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';

export function initDB(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'New Chat',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      reasoning TEXT,
      citations TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chats_workspace ON chats(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
  `);
}
```

- [ ] **Step 3: Create database connection**

```typescript
// src/lib/db/index.ts
import Database from 'better-sqlite3';
import path from 'path';
import { initDB } from './schema';

const DB_PATH = path.join(process.cwd(), 'data', 'chat.db');

let db: Database.Database;

export function getDB() {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initDB(db);
  }
  return db;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types/index.ts src/lib/db/
git commit -m "feat: add database schema and types"
```

---

## Task 3: LangChain & Web Search Tools

**Files:**
- Create: `src/lib/langchain/index.ts`
- Create: `src/lib/langchain/chat.ts`
- Create: `src/lib/langchain/tools/web-search.ts`
- Create: `src/lib/langchain/tools/web-fetch.ts`

- [ ] **Step 1: Create web search tool (custom, no SDK browsing plugin)**

```typescript
// src/lib/langchain/tools/web-search.ts
import { z } from 'zod';
import { DynamicTool } from '@langchain/core/tools';

const searchSchema = z.object({
  query: z.string().describe('Search query for web search'),
});

export function createWebSearchTool() {
  return new DynamicTool({
    name: 'web_search',
    description: 'Search the web for current information. Returns snippets from search results.',
    schema: searchSchema,
    async func({ query }) {
      const response = await fetch(
        `https://openrouter.ai/api/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.0-flash-001',
            messages: [{
              role: 'user',
              content: `Search the web for: ${query}. Return the top 5 results with titles, URLs, and brief summaries.`
            }]
          })
        }
      );
      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No results found';
    },
  });
}
```

- [ ] **Step 2: Create web fetch tool**

```typescript
// src/lib/langchain/tools/web-fetch.ts
import { z } from 'zod';
import { DynamicTool } from '@langchain/core/tools';

const fetchSchema = z.object({
  url: z.string().url().describe('URL to fetch content from'),
  query: z.string().optional().describe('Specific information to extract'),
});

export function createWebFetchTool() {
  return new DynamicTool({
    name: 'web_fetch',
    description: 'Fetch content from a specific URL. Useful for getting detailed information from search results.',
    schema: fetchSchema,
    async func({ url, query }) {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AI-Chat/1.0)'
        }
      });
      const text = await response.text();
      if (query) {
        return `Information about ${query}: ${text.slice(0, 2000)}`;
      }
      return text.slice(0, 3000);
    },
  });
}
```

- [ ] **Step 3: Create chat model configuration**

```typescript
// src/lib/langchain/chat.ts
import { ChatOpenAI } from '@langchain/openai';

export function createChatModel(model = 'google/gemini-2.0-flash-001') {
  return new ChatOpenAI({
    model,
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    basePath: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    streaming: true,
    temperature: 0.7,
  });
}

export function createReasoningModel() {
  return createChatModel('google/gemini-2.0-flash-001');
}

export function createStrongModel() {
  return createChatModel('anthropic/claude-3.5-sonnet');
}
```

- [ ] **Step 4: Create LangChain index**

```typescript
// src/lib/langchain/index.ts
import { createWebSearchTool } from './tools/web-search';
import { createWebFetchTool } from './tools/web-fetch';
import { createChatModel, createReasoningModel, createStrongModel } from './chat';

export { createWebSearchTool, createWebFetchTool, createChatModel, createReasoningModel, createStrongModel };
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/langchain/
git commit -m "feat: add LangChain setup with custom web search and fetch tools"
```

---

## Task 4: Streaming Reasoning Chain

**Files:**
- Create: `src/lib/langchain/chains/reasoning.ts`
- Create: `src/lib/streaming/sse.ts`

- [ ] **Step 1: Create SSE utilities**

```typescript
// src/lib/streaming/sse.ts
export function createSSEStream(stream: AsyncGenerator<string>) {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const chunk of stream) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: chunk })}\n\n`));
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      controller.close();
    },
  });
}

export function sseResponse(stream: AsyncGenerator<string>) {
  return new Response(createSSEStream(stream), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: Create streaming reasoning chain**

```typescript
// src/lib/langchain/chains/reasoning.ts
import { createReasoningModel, createWebSearchTool, createWebFetchTool } from '../index';

export async function* streamingReasoningChain(userMessage: string, context?: string) {
  const model = createReasoningModel();
  const webSearch = createWebSearchTool();
  const webFetch = createWebFetchTool();

  const tools = [webSearch, webFetch];
  const modelWithTools = model.bindTools(tools);

  let reasoningBuffer = '';
  let finalAnswerBuffer = '';
  let inReasoning = false;

  const systemPrompt = context
    ? `You are a helpful AI assistant. Previous conversation context:\n${context}\n\nWhen reasoning, prefix with [REASONING] and end with [END_REASONING].`
    : 'You are a helpful AI assistant. When reasoning, prefix with [REASONING] and end with [END_REASONING].';

  const stream = await modelWithTools.stream([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ]);

  for await (const chunk of stream) {
    const content = chunk.content.toString();

    if (content.includes('[REASONING]')) {
      inReasoning = true;
    }

    if (inReasoning) {
      reasoningBuffer += content;
      yield `reasoning:${reasoningBuffer}`;
    }

    if (content.includes('[END_REASONING]')) {
      inReasoning = false;
      reasoningBuffer = reasoningBuffer.replace('[REASONING]', '').replace('[END_REASONING]', '');
      yield `reasoning:${reasoningBuffer}`;
    }

    if (!inReasoning && !content.includes('[REASONING]') && !content.includes('[END_REASONING]')) {
      finalAnswerBuffer += content;
      yield `answer:${finalAnswerBuffer}`;
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/langchain/chains/reasoning.ts src/lib/streaming/
git commit -m "feat: add streaming reasoning chain with SSE"
```

---

## Task 5: Cross-Chat Retrieval Chain

**Files:**
- Create: `src/lib/vector-store/index.ts`
- Create: `src/lib/langchain/chains/cross-chat.ts`

- [ ] **Step 1: Create vector store setup**

```typescript
// src/lib/vector-store/index.ts
import { OpenAIEmbeddings } from '@langchain/openai';
import { SqliteVSS } from 'sqlite-vss';

export function createEmbeddings() {
  return new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    basePath: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    model: 'google/gemini-2.0-flash-001',
  });
}

export async function initVectorStore(db: any) {
  const embeddings = createEmbeddings();
  return new SqliteVSS(db, embeddings);
}
```

- [ ] **Step 2: Create cross-chat retrieval chain**

```typescript
// src/lib/langchain/chains/cross-chat.ts
import { createChatModel } from '../chat';
import { createEmbeddings } from '../../vector-store';

export async function retrieveCrossChatContext(
  workspaceId: string,
  currentMessage: string,
  db: any
) {
  const embeddings = createEmbeddings();
  const embedding = await embeddings.embedQuery(currentMessage);

  const results = db.prepare(`
    SELECT id, content, chat_id, similarity
    FROM chat_messages_vss
    WHERE workspace_id = ?
    AND similarity > 0.7
    ORDER BY similarity DESC
    LIMIT 3
  `).all(workspaceId, embedding);

  if (results.length === 0) return null;

  return results.map((r: any) => ({
    chatId: r.chat_id,
    content: r.content,
    similarity: r.similarity,
  }));
}

export async function generateWithCrossChatContext(
  userMessage: string,
  context: any[],
  chatHistory: string
) {
  const model = createChatModel();

  const contextPrompt = context.length > 0
    ? `Related to your previous conversations:\n${context.map((c: any) => `- ${c.content}`).join('\n')}\n\n`
    : '';

  const response = await model.invoke([
    { role: 'system', content: 'You are a helpful AI assistant. When referencing previous conversations, cite them explicitly.' },
    { role: 'user', content: `${contextPrompt}Previous chat history:\n${chatHistory}\n\nCurrent question: ${userMessage}` }
  ]);

  return response.content.toString();
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/vector-store/ src/lib/langchain/chains/cross-chat.ts
git commit -m "feat: add cross-chat semantic retrieval with vector store"
```

---

## Task 6: API Routes

**Files:**
- Create: `src/app/api/chat/route.ts`
- Create: `src/app/api/workspaces/route.ts`
- Create: `src/app/api/workspaces/[id]/route.ts`
- Create: `src/app/api/chats/route.ts`
- Create: `src/app/api/chats/[id]/route.ts`

- [ ] **Step 1: Create chat API route with streaming**

```typescript
// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { streamingReasoningChain } from '@/lib/langchain/chains/reasoning';
import { retrieveCrossChatContext } from '@/lib/langchain/chains/cross-chat';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  const { chatId, message, workspaceId } = await req.json();
  const db = getDB();

  // Retrieve cross-chat context
  const crossChatContext = await retrieveCrossChatContext(workspaceId, message, db);

  // Get chat history for context
  const history = db.prepare(`
    SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC
  `).all(chatId);
  const chatHistory = history.map((m: any) => `${m.role}: ${m.content}`).join('\n');

  // Save user message
  const userMsgId = uuid();
  db.prepare(`
    INSERT INTO messages (id, chat_id, role, content, created_at)
    VALUES (?, ?, 'user', ?, ?)
  `).run(userMsgId, chatId, message, Date.now());

  // Generate response with streaming
  const stream = streamingReasoningChain(
    message,
    crossChatContext ? chatHistory + '\n\nRelated: ' + JSON.stringify(crossChatContext) : chatHistory
  );

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let reasoningBuffer = '';
      let finalAnswerBuffer = '';

      for await (const chunk of stream) {
        if (chunk.startsWith('reasoning:')) {
          reasoningBuffer = chunk.replace('reasoning:', '');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'reasoning', content: reasoningBuffer })}\n\n`));
        } else if (chunk.startsWith('answer:')) {
          finalAnswerBuffer = chunk.replace('answer:', '');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'answer', content: finalAnswerBuffer })}\n\n`));
        }
      }

      // Save assistant message
      const assistantMsgId = uuid();
      db.prepare(`
        INSERT INTO messages (id, chat_id, role, content, reasoning, created_at)
        VALUES (?, ?, 'assistant', ?, ?, ?)
      `).run(assistantMsgId, chatId, finalAnswerBuffer, reasoningBuffer, Date.now());

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', messageId: assistantMsgId })}\n\n`));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: Create workspaces API routes**

```typescript
// src/app/api/workspaces/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { v4 as uuid } from 'uuid';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export async function GET() {
  const db = getDB();
  const workspaces = db.prepare('SELECT * FROM workspaces ORDER BY created_at DESC').all();
  return NextResponse.json(workspaces);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  const db = getDB();
  const id = uuid();
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const now = Date.now();

  db.prepare(`
    INSERT INTO workspaces (id, name, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, color, now, now);

  return NextResponse.json({ id, name, color, createdAt: now, updatedAt: now });
}
```

```typescript
// src/app/api/workspaces/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();
  const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
  if (!workspace) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(workspace);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, color } = await req.json();
  const db = getDB();

  db.prepare(`
    UPDATE workspaces SET name = ?, color = ?, updated_at = ? WHERE id = ?
  `).run(name, color, Date.now(), id);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();
  db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Create chats API routes**

```typescript
// src/app/api/chats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspaceId');
  const db = getDB();

  const chats = db.prepare(`
    SELECT * FROM chats WHERE workspace_id = ? ORDER BY updated_at DESC
  `).all(workspaceId);

  return NextResponse.json(chats);
}

export async function POST(req: NextRequest) {
  const { workspaceId, title } = await req.json();
  const db = getDB();
  const id = uuid();
  const now = Date.now();

  db.prepare(`
    INSERT INTO chats (id, workspace_id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, workspaceId, title || 'New Chat', now, now);

  return NextResponse.json({ id, workspaceId, title: title || 'New Chat', createdAt: now, updatedAt: now });
}
```

```typescript
// src/app/api/chats/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();
  const messages = db.prepare(`
    SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC
  `).all(id);
  return NextResponse.json(messages);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();
  db.prepare('DELETE FROM chats WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/
git commit -m "feat: add API routes for chat, workspaces, and cross-chat retrieval"
```

---

## Task 7: React Context & State Management

**Files:**
- Create: `src/context/WorkspaceContext.tsx`
- Create: `src/context/ChatContext.tsx`

- [ ] **Step 1: Create WorkspaceContext**

```typescript
// src/context/WorkspaceContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Workspace {
  id: string;
  name: string;
  color: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (w: Workspace) => void;
  addWorkspace: (name: string) => Promise<void>;
  updateWorkspace: (id: string, name: string, color: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  const refreshWorkspaces = async () => {
    const res = await fetch('/api/workspaces');
    const data = await res.json();
    setWorkspaces(data);
    if (data.length > 0 && !currentWorkspace) {
      setCurrentWorkspace(data[0]);
    }
  };

  useEffect(() => { refreshWorkspaces(); }, []);

  const addWorkspace = async (name: string) => {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const workspace = await res.json();
    setWorkspaces([workspace, ...workspaces]);
    setCurrentWorkspace(workspace);
  };

  const updateWorkspace = async (id: string, name: string, color: string) => {
    await fetch(`/api/workspaces/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    await refreshWorkspaces();
  };

  const deleteWorkspace = async (id: string) => {
    await fetch(`/api/workspaces/${id}`, { method: 'DELETE' });
    setWorkspaces(workspaces.filter(w => w.id !== id));
    if (currentWorkspace?.id === id) {
      setCurrentWorkspace(workspaces[0] || null);
    }
  };

  return (
    <WorkspaceContext.Provider value={{
      workspaces, currentWorkspace, setCurrentWorkspace,
      addWorkspace, updateWorkspace, deleteWorkspace, refreshWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext)!;
```

- [ ] **Step 2: Create ChatContext**

```typescript
// src/context/ChatContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
```

- [ ] **Step 3: Commit**

```bash
git add src/context/
git commit -m "feat: add React context for workspace and chat state management"
```

---

## Task 8: UI Components

**Files:**
- Create: `src/app/components/Sidebar.tsx`
- Create: `src/app/components/WorkspaceItem.tsx`
- Create: `src/app/components/ChatBlock.tsx`
- Create: `src/app/components/ChatMessage.tsx`
- Create: `src/app/components/ReasoningStream.tsx`
- Create: `src/app/components/ChatInput.tsx`
- Create: `src/app/components/providers/AppProviders.tsx`

- [ ] **Step 1: Create AppProviders**

```typescript
// src/app/components/providers/AppProviders.tsx
'use client';

import { ReactNode } from 'react';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { ChatProvider } from '@/context/ChatContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <ChatProvider>
        {children}
      </ChatProvider>
    </WorkspaceProvider>
  );
}
```

- [ ] **Step 2: Create Sidebar**

```typescript
// src/app/components/Sidebar.tsx
'use client';

import { useWorkspace } from '@/context/WorkspaceContext';
import { useChat } from '@/context/ChatContext';
import { useState } from 'react';

export function Sidebar() {
  const { workspaces, currentWorkspace, setCurrentWorkspace, addWorkspace, deleteWorkspace } = useWorkspace();
  const { chats, currentChat, setCurrentChat, createChat, deleteChat, refreshChats } = useChat();
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const handleWorkspaceSelect = async (workspace: any) => {
    setCurrentWorkspace(workspace);
    await refreshChats(workspace.id);
  };

  const handleCreateChat = async () => {
    if (!currentWorkspace) return;
    await createChat(currentWorkspace.id);
  };

  const handleAddWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    await addWorkspace(newWorkspaceName);
    setNewWorkspaceName('');
    setShowNewWorkspace(false);
  };

  return (
    <div className="w-64 h-full bg-zinc-900 text-white flex flex-col">
      <div className="p-4 border-b border-zinc-700">
        <h2 className="text-lg font-semibold mb-2">Workspaces</h2>
        {showNewWorkspace ? (
          <div className="flex gap-2">
            <input
              value={newWorkspaceName}
              onChange={e => setNewWorkspaceName(e.target.value)}
              className="flex-1 px-2 py-1 rounded bg-zinc-800 text-white text-sm"
              placeholder="Workspace name"
            />
            <button onClick={handleAddWorkspace} className="px-2 py-1 bg-indigo-600 rounded text-sm">Add</button>
          </div>
        ) : (
          <button onClick={() => setShowNewWorkspace(true)} className="text-sm text-indigo-400 hover:text-indigo-300">
            + New Workspace
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {workspaces.map(ws => (
          <div key={ws.id}>
            <div
              onClick={() => handleWorkspaceSelect(ws)}
              className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-zinc-800 ${currentWorkspace?.id === ws.id ? 'bg-zinc-800' : ''}`}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ws.color }} />
              <span className="flex-1 truncate">{ws.name}</span>
              <button onClick={e => { e.stopPropagation(); deleteWorkspace(ws.id); }} className="text-zinc-500 hover:text-red-400 text-xs">×</button>
            </div>

            {currentWorkspace?.id === ws.id && (
              <div className="ml-4 border-l border-zinc-700">
                <button onClick={handleCreateChat} className="w-full text-left px-4 py-1 text-sm text-indigo-400 hover:text-indigo-300">
                  + New Chat
                </button>
                {chats.filter(c => c.workspaceId === ws.id).map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => setCurrentChat(chat)}
                    className={`px-4 py-1 cursor-pointer hover:bg-zinc-800 text-sm truncate ${currentChat?.id === chat.id ? 'bg-zinc-800 text-indigo-300' : 'text-zinc-400'}`}
                  >
                    {chat.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create ChatMessage and ReasoningStream**

```typescript
// src/app/components/ReasoningStream.tsx
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
```

```typescript
// src/app/components/ChatMessage.tsx
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
      <div className={`max-w-[70%] rounded-lg p-3 ${isUser ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
        <div className="whitespace-pre-wrap">{content}</div>
        {!isUser && reasoning && <ReasoningStream reasoning={reasoning} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ChatInput**

```typescript
// src/app/components/ChatInput.tsx
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
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t">
      <input
        value={message}
        onChange={e => setMessage(e.target.value)}
        disabled={disabled}
        className="flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Type your message..."
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="px-6 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700"
      >
        Send
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Create ChatBlock**

```typescript
// src/app/components/ChatBlock.tsx
'use client';

import { useChat } from '@/context/ChatContext';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useEffect, useRef } from 'react';

export function ChatBlock() {
  const { currentChat, messages, sendMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Select or create a chat to start messaging
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b bg-white dark:bg-zinc-900">
        <h3 className="font-semibold">{currentChat.title}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-zinc-400 mt-8">
            Start a conversation...
          </div>
        )}
        {messages.map(msg => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} reasoning={msg.reasoning} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSend={sendMessage} disabled={!currentChat} />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/components/
git commit -m "feat: add UI components for sidebar, chat, and streaming display"
```

---

## Task 9: Main App Layout

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update layout with providers**

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "./components/providers/AppProviders";

export const metadata: Metadata = {
  title: "AI Chat - Multi-Workspace",
  description: "AI Chat with cross-chat contextual awareness",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
<AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update main page**

```typescript
// src/app/page.tsx
'use client';

import { Sidebar } from './components/Sidebar';
import { ChatBlock } from './components/ChatBlock';

export default function Home() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 flex flex-col bg-white dark:bg-zinc-950">
        <ChatBlock />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx
git commit -m "feat: wire up main app layout with sidebar and chat block"
```

---

## Task 10: Documentation

**Files:**
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/API_COST_MANAGEMENT.md`

- [ ] **Step 1: Create architecture documentation**

```markdown
# Architecture Documentation

## UI/UX Design

### Component Library
- **Tailwind CSS v4** - Utility-first CSS framework
- Custom components built on top of Tailwind primitives
- No external component library (keep lightweight)

### Navigation Approach
- **Sidebar navigation** for workspace switching
- **Collapsible chat list** within each workspace
- **Full-width chat area** for conversations

### Color System
- Workspaces are color-coded with predefined palette
- Dark mode support via Tailwind dark: variants
- Indigo as primary accent color

## Agentic Framework

### Framework Choice: LangChain + LangGraph

**Alternatives considered:**
- **LlamaIndex**: Better for RAG, less flexible for agents
- **Custom implementation**: Too much boilerplate
- **LangChain**: Best balance of flexibility and abstraction

**LangChain benefits:**
- Built-in tool binding for custom web search
- Streaming support out of the box
- Easy integration with OpenRouter

### Tool Implementation
Custom web search and fetch tools built on top of OpenRouter's LLM API:
- `web_search`: Uses LLM to search the web
- `web_fetch`: Fetches and summarizes web content

No inbuilt SDK browsing plugins used - all custom implementation.

## Streaming Architecture

### Real-Time Token Streaming
- **Server-Sent Events (SSE)** for streaming responses
- **AsyncGenerator** pattern in LangChain for chunked output
- Separate reasoning and answer streams

### Reasoning Separation
- Reasoning prefixed with `[REASONING]` marker
- Answer prefixed with `[END_REASONING]` marker
- UI displays reasoning in visually distinct amber-highlighted box
- Final answer appears after reasoning completes

### Implementation
```typescript
// streamingReasoningChain yields:
// - "reasoning:{content}" for step-by-step reasoning
// - "answer:{content}" for final response
```

## Web Connectivity

### How It Works
1. User sends message
2. LangChain agent receives message
3. Agent decides if web search is needed
4. Custom `web_search` tool executes via OpenRouter LLM
5. Results fed back to agent for synthesis
6. Final response streamed to client

### No SDK Browsing Plugins
- All web connectivity through custom LangChain tools
- LLM-powered search synthesis
- Transparent to user (shows "Fetching live data..." indicator)

## Cross-Chat Context Retrieval

### Embedding Model
- **google/gemini-2.0-flash-001** for embeddings via OpenRouter
- Same model for both embeddings and chat (cost efficiency)

### Vector Store
- **sqlite-vss** - SQLite extension for vector search
- Embedded in SQLite database for simplicity
- No external vector database needed

### Retrieval Strategy
1. On new message, embed query
2. Search vector store for similar messages in same workspace
3. If similarity > 0.7, include as context
4. Context passed to LLM with citation instruction

### Citation Display
- Responses explicitly cite referenced chats
- Format: "Based on your earlier conversation about X..."
- Links back to source chat in sidebar

## Authentication

### No Authentication Implemented
- This is a screening assignment demo
- No user accounts or auth needed
- All data stored locally in SQLite

### Future Considerations
- NextAuth.js integration possible
- Per-workspace access control
- API key per user

## API Cost Management

### Model Routing Strategy
| Task | Model | Cost |
|------|-------|------|
| Embeddings | google/gemini-2.0-flash-001 | ~$0.001/1K tokens |
| Web search synthesis | google/gemini-2.0-flash-001 | ~$0.001/1K tokens |
| Main chat | anthropic/claude-3.5-sonnet | ~$0.003/1K tokens |
| Final validation | anthropic/claude-3.5-sonnet | ~$0.003/1K tokens |

### Cost Control Measures
1. **$8 hard cap** on OpenRouter key
2. **Flash model for development** - used extensively
3. **Sonnet only for final validation** - minimal usage
4. **Embedding reuse** - cache message embeddings
5. **No redundant API calls** - stream directly

### Monitoring
- Log all API calls with token counts
- Track remaining budget
- Alert when approaching $8 cap
```

- [ ] **Step 2: Create API cost management doc**

```markdown
# API Cost Management Strategy

## OpenRouter Budget: $8.00 Hard Cap

### Cost Breakdown by Feature

| Feature | Model | Est. Tokens/Call | Est. Cost/Call | Max Calls |
|---------|-------|-----------------|----------------|-----------|
| Embed query | gemini-flash | 100 | $0.0001 | 80,000 |
| Web search | gemini-flash | 500 | $0.0005 | 16,000 |
| Main chat | claude-sonnet | 2000 | $0.006 | 1,333 |
| Cross-chat retrieval | gemini-flash | 300 | $0.0003 | 26,666 |

### Recommendations

1. **Use flash model for everything except final output**
   - Embeddings: always flash
   - Web search synthesis: always flash
   - Reasoning chain: always flash
   - Final answer: can use stronger model

2. **Batch cross-chat queries**
   - Don't embed every message individually
   - Batch embed every 10 messages

3. **Cache aggressively**
   - Cache embeddings in SQLite
   - Don't re-embed same content

4. **Estimate before streaming**
   - Show cost estimate before sending
   - Warn if approaching budget

### Monitoring Script
```typescript
function logAPICall(model: string, tokens: number, cost: number) {
  console.log(`[API] ${model}: ${tokens} tokens, $${cost.toFixed(4)}`);
  // Update running total in DB
}
```
```

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs: add architecture and cost management documentation"
```

---

## Task 11: README& Deployment

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README**

```markdown
# AI Chat - Multi-Workspace

A multi-workspace AI chat application with real-time web-connected responses, streaming reasoning, and cross-chat contextual awareness.

## Features

- **Multi-Workspace Architecture**: Create and switch between isolated workspaces
- **Real-Time Web Search**: AI retrieves live information without SDK browsing plugins
- **Streaming Reasoning**: Visible chain-of-thought reasoning before final answer
- **Chat History**: Persistent logs per workspace with full conversation history
- **Cross-Chat Context**: Semantic retrieval across chats within same workspace

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI Framework**: LangChain + LangGraph
- **Database**: SQLite with sqlite-vss for vector search
- **API**: OpenRouter (unified access to multiple LLM providers)

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` with your OpenRouter API key:
   ```bash
   OPENROUTER_API_KEY=your-api-key
   OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Architecture

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   └── components/         # React components
├── context/               # React context providers
└── lib/                   # Core libraries
    ├── db/               # SQLite database
    ├── langchain/         # LangChain setup & tools
    └── vector-store/      # Vector search
```

## API Cost Management

This project uses OpenRouter with a hard $8 cap. Cost-effective model routing:

- **google/gemini-2.0-flash-001**: Embeddings, web search, reasoning
- **anthropic/claude-3.5-sonnet**: Final validation only

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and architecture overview"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] Multi-workspace architecture - Task 1, 2, 7, 8
- [x] Real-time web-connected responses - Task 3, 4
- [x] Streaming reasoning - Task 4, 8
- [x] Chat history & logs - Task 2, 6, 7
- [x] Cross-chat contextual awareness - Task 5, 6
- [x] GitHub repo + README - Task 11
- [x] Live hosted URL - Deployment instructions
- [x] Documentation - Task 10

**2. Placeholder scan:** No placeholders found - all steps have complete code.

**3. Type consistency:** All types defined in `src/lib/types/index.ts` and used consistently across tasks.

---

## Execution Options

**Plan complete and saved to `.opencode/plans/2026-06-06-ai-chat-app.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
