# Technical Documentation

## AI Chat - Multi-Workspace Chat Application

A production-ready AI chat application with streaming reasoning, real-time web search, and cross-chat contextual retrieval.

---

## Table of Contents

1. [UI/UX Decisions](#uiux-decisions)
2. [Component Library](#component-library)
3. [Agentic Framework](#agentic-framework)
4. [Streaming Implementation](#streaming-implementation)
5. [Cross-Chat Retrieval](#cross-chat-retrieval)
6. [Authentication Approach](#authentication-approach)
7. [OpenRouter Integration](#openrouter-integration)

---

## UI/UX Decisions

### Design Philosophy

The application uses a **dark-first design** optimized for extended AI interaction sessions. The interface prioritizes readability and cognitive load reduction through clear visual hierarchy and minimal chrome.

### Color System

The color system uses the **oklch color space** for perceptually uniform dark theme colors:

```css
--background: oklch(0.145 0 0);      /* Main background */
--foreground: oklch(0.985 0 0);      /* Primary text */
--card: oklch(0.205 0 0);            /* Card backgrounds */
--primary: oklch(0.922 0 0);         /* Interactive elements */
--border: oklch(1 0 0 / 10%);        /* Subtle borders */
```

**Why oklch?** Unlike RGB or HSL, oklch provides perceptually uniform color transitions, ensuring dark mode gradients appear natural without the "muddy" artifacts common with older color spaces.

### Layout Architecture

```
┌─────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌────────────────────────────────────┐ │
│ │          │ │                                    │ │
│ │ Sidebar  │ │         ChatBlock │ │
│ │ (256px)  │ │                                    │ │
│ │          │ │  ┌──────────────────────────────┐  │ │
│ │ Workspaces│ │  │  Messages │  │ │
│ │ └ Chats │ │  │  (scrollable) │  │ │
│ │          │ │  └──────────────────────────────┘  │ │
│ │          │ │  ┌──────────────────────────────┐  │ │
│ │          │ │  │  ChatInput                  │  │ │
│ │          │ │  └──────────────────────────────┘  │ │
│ └──────────┘ └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Key Layout Decisions:**

1. **Fixed sidebar (256px)** — Provides persistent navigation without consuming main content space
2. **Workspace → Chat hierarchy** — Two-level nesting allows organization without deep nesting
3. **Color-coded workspaces** — Visual distinction via colored dots enables quick workspace identification
4. **Max-width messages (768px)** — Prevents lines from becoming too long for comfortable reading

### Reasoning Transparency UX

The reasoning process is displayed separately from the final answer, appearing in a collapsible section below each assistant response. This follows research showing that exposing AI reasoning builds user trust and helps identify when the model may be going off-track.

**Visual treatment:**
- Reasoning in muted background with distinct border
- Brain icon indicator
- Slightly smaller, muted text color

---

## Component Library

### Base Components (shadcn/ui)

The application builds on shadcn/ui components with the "new-york" style variant:

| Component | Purpose |
|----------|---------|
| `Button` | Primary actions, form submissions |
| `ThemeProvider` | Next-themes wrapper for dark/light switching |

### Custom Components

#### `ChatBlock` (`app/components/ChatBlock.tsx`)
Main chat interface container managing scroll behavior and message rendering.

**Key features:**
- Auto-scroll to bottom on new messages (respects user scroll position)
- Optimistic UI updates for user messages
- Empty state when no chat selected

```typescript
// Auto-scroll logic
const handleScroll = useCallback(() => {
  const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  autoScrollRef.current = isNearBottom;
}, []);
```

#### `ChatMessage` (`app/components/ChatMessage.tsx`)
Renders individual messages with support for reasoning display and web search indicators.

**Props:**
```typescript
interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  webSearchActive?: boolean;
  webSearchQuery?: string;
  webSearchResults?: string[];
}
```

**Visual differentiation:**
- User messages: right-aligned, darker background
- Assistant messages: left-aligned, slightly lighter background
- Web search indicator: Globe icon with status (searching/complete)

#### `ReasoningStream` (`app/components/ReasoningStream.tsx`)
Displays the AI's reasoning process in a collapsible panel.

**Design:**
- Brain icon header
- Muted background to visually subordinate reasoning
- Monospace-adjacent styling for technical content feel

#### `ChatInput` (`app/components/ChatInput.tsx`)
Message composition with disabled state handling.

**Features:**
- Form submission via Enter key
- Submit button disabled when empty or while processing
- Subtle focus states with border color change

#### `Sidebar` (`app/components/Sidebar.tsx`)
Workspace and chat navigation with inline creation.

**State:**
- New workspace input (toggle visibility)
- Workspace selection (highlighted when active)
- Chat list per workspace (expandable/collapsible)

### Context Providers

#### `WorkspaceProvider` (`context/WorkspaceContext.tsx`)
Manages workspace state across the application.

```typescript
interface WorkspaceContextType {
  workspaces: WorkspaceType[];
  currentWorkspace: WorkspaceType | null;
  setCurrentWorkspace: (w: WorkspaceType) => void;
  addWorkspace: (name: string) => Promise<void>;
  updateWorkspace: (id: string, name: string, color: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}
```

#### `ChatProvider` (`context/ChatContext.tsx`)
Manages chat state, message history, and streaming.

```typescript
interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  setCurrentChat: (c: Chat) => void;
  createChat: (workspaceId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  refreshChats: (workspaceId: string) => Promise<void>;
}
```

**Streaming message flow:**
1. User sends message → optimistic user message added
2. Empty assistant message placeholder created
3. SSE stream parsed → reasoning/answer buffers updated in real-time
4. `done` event → placeholder ID replaced with actual ID from server

---

## Agentic Framework

### Overview

The agentic framework uses a **reasoning-first approach** where the model generates visible chain-of-thought before producing answers. When web search is needed, the model can invoke tools dynamically.

### Architecture

```
User Message
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  streamingReasoningChain (lib/langchain/chains/    │
│  reasoning.ts)                                      │
│                                                     │
│ 1. System prompt + context + user message         │
│  2. OpenRouter API with include_reasoning: true     │
│  3. SSE stream parsing                              │
│  4. Tool detection (web_search) │
│  5. Tool execution → continuation │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  Cross-Chat Context Retrieval                       │
│  (lib/langchain/chains/cross-chat.ts)              │
│                                                     │
│  1. Embed current message                           │
│  2. Cosine similarity against workspace messages   │
│  3. Threshold check (0.7) or keyword fallback       │
│  4. Top 3 results injected as context               │
└─────────────────────────────────────────────────────┘
```

### Reasoning Chain (`streamingReasoningChain`)

The reasoning chain handles streaming responses with tool execution:

**Request configuration:**
```typescript
{
  model: CHAT_MODEL, // anthropic/claude-3.5-haiku
  messages: [...],
  tools: toolDefinitions,
  stream: true,
  include_reasoning: true,
  reasoning: { enabled: true, effort: 'medium' },
  max_tokens: 2000,
}
```

**Event types emitted:**
- `reasoning` — Token-by-token reasoning updates
- `answer` — Token-by-token answer updates
- `tool` — Tool invocation detected
- `tool_result` — Tool execution result
- `done` — Stream completion

### Tool Execution Flow

When the model invokes `web_search`:

1. **Tool call detected** → Emit `{ type: 'tool', name: 'web_search', input: query }`
2. **Execute search** → Call Tavily API
3. **Emit result** → Emit `{ type: 'tool_result', name: 'web_search', result }`
4. **Append to messages** → Add assistant tool call + tool result to message history
5. **Continuation** → Second OpenRouter request with updated context
6. **Final response** → Stream continues with web search context

### Web Search Tool (`web-search.ts`)

Tavily API integration for real-time web search:

```typescript
POST https://api.tavily.com/search
{
  api_key: TAVILY_API_KEY,
  query: search query,
  search_depth: 'basic',
  max_results: 5,
  include_answer: false,
  include_raw_content: false,
}
```

Returns formatted results with title, URL, and content snippet.

---

## Streaming Implementation

### Server-Side (SSE)

The chat API (`app/api/chat/route.ts`) returns a `ReadableStream` with SSE-formatted data:

```typescript
// Event format
data: {"type": "reasoning", "content": "..."}\n\n
data: {"type": "answer", "content": "..."}\n\n
data: {"type": "tool", "name": "web_search", "input": "..."}\n\n
data: {"type": "tool_result", "name": "web_search", "result": "..."}\n\n
data: {"type": "done", "messageId": "...", "citations": [...]}\n\n
```

**Headers:**
```typescript
{
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
}
```

### Client-Side Parsing

The `ChatContext.sendMessage` handles SSE parsing:

```typescript
const reader = res.body?.getReader();
const decoder = new TextDecoder();
let streamBuffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  streamBuffer += decoder.decode(value, { stream: true });
  const parts = streamBuffer.split('\n\n');
  streamBuffer = parts.pop() || '';

  for (const part of parts) {
    const line = part.split('\n').find(l => l.startsWith('data: '));
    const data = JSON.parse(line.replace('data: ', ''));
    // Handle by type...
  }
}
```

### Buffering Strategy

Two separate buffers maintain state:
- `reasoningBuffer` — Accumulates full reasoning text
- `answerBuffer` — Accumulates full answer text

Both update incrementally via React state updates, enabling real-time display.

---

## Cross-Chat Retrieval

### Overview

Cross-chat retrieval enables the AI to contextually reference relevant messages from previous conversations within the same workspace.

### Embedding Pipeline

**Storage:**
1. User or assistant message created
2. `storeMessageEmbedding` called asynchronously
3. Message embedded via OpenAI text-embedding-3-small (via OpenRouter)
4. Embedding stored as binary blob in `message_embeddings` table

**Retrieval:**
1. New user message embedded
2. Cosine similarity calculated against all workspace embeddings
3. Results above0.7 threshold selected
4. Top 3 results with chat titles injected as context

### Cosine Similarity Implementation

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### Keyword Fallback

If no embeddings exceed the 0.7 threshold:
1. Extract keywords (3+ character tokens) from current message
2. Score previous messages by keyword overlap
3. Filter to scores > 0.2
4. Return top 3

### Context Injection Format

```typescript
const contextStr = context + '\n\n[Cross-chat context from related conversations. If you use this context, cite the chat title explicitly.]:\n'
  + crossChatContext.map(c => `- From "${c.chatTitle}": ${c.snippet}`)
 .join('\n');
```

The explicit instruction to cite chat titles ensures responses properly attribute referenced content.

---

## Authentication Approach

### Current State

**No authentication is currently implemented.** The application is designed for single-user local deployment.

### Limitations

1. **No user isolation** — All users share the same workspace/chat data
2. **No access control** — Anyone with server access can view/modify data
3. **No audit logging** — User actions not tracked

### Production Considerations

For production deployment, authentication should be added:

| Approach | Pros | Cons |
|----------|------|------|
| NextAuth.js | Full-featured, multiple providers | Setup complexity |
| Clerk | Drop-in auth UI, good DX | External dependency, cost at scale |
| Custom JWT | Full control | Security audit required |

**Recommended path:** NextAuth.js with session cookies and workspace-scoped user ownership.

### Database-Level Considerations

Current schema has no user references:
```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

Future schema would need:
```sql
ALTER TABLE workspaces ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE chats ADD COLUMN user_id TEXT REFERENCES users(id);
```

---

## OpenRouter Integration

### API Configuration

OpenRouter is used as a unified API gateway for Claude models:

```typescript
const chatModel = new ChatOpenAI({
  model: 'anthropic/claude-3.5-haiku',
  openAIApiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  },
  streaming: true,
  temperature: 0.7,
});
```

### Model Selection

| Model | Use Case | Cost |
|-------|----------|------|
| `anthropic/claude-3.5-haiku` | Primary reasoning (fast, cheap) | ~$0.80/1M tokens |
| `anthropic/claude-3.5-sonnet` | Complex tasks (if needed) | ~$3/1M tokens |

Default uses Haiku for cost efficiency with optional Sonnet for complex reasoning tasks.

### Reasoning Parameter

OpenRouter supports Anthropic's extended reasoning via:

```typescript
{
  include_reasoning: true,
  reasoning: { enabled: true, effort: 'medium' },
}
```

This enables the visible chain-of-thought streaming feature.

### Environment Variables

```env
OPENROUTER_API_KEY=sk-or-v1-... # Required
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1  # Optional, defaults to OpenRouter
OPENROUTER_MODEL=anthropic/claude-3.5-haiku  # Optional
```

---

## Database Schema

### Entity Relationship

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  workspaces  │──────<│    chats     │──────<│   messages  │
└──────────────┘   1:N └──────────────┘   1:N └──────────────┘
                                           │
                                           │ 1:N
                                           ▼
                                    ┌──────────────┐
                                    │message_      │
                                    │embeddings    │
                                    └──────────────┘
```

### Tables

**workspaces**
- `id` (PK), `name`, `color`, `created_at`, `updated_at`

**chats**
- `id` (PK), `workspace_id` (FK), `title`, `created_at`, `updated_at`

**messages**
- `id` (PK), `chat_id` (FK), `role` (user|assistant), `content`, `reasoning`, `citations`, `embedding_id`, `created_at`

**message_embeddings**
- `id` (PK), `workspace_id`, `chat_id`, `message_id`, `content`, `embedding` (BLOB), `created_at`

### Indexes

```sql
CREATE INDEX idx_chats_workspace ON chats(workspace_id);
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_embeddings_workspace ON message_embeddings(workspace_id);
```

---

## License

MIT
