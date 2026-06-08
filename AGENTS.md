<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint check
```

## Environment Variables

Required:
- `OPENROUTER_API_KEY` — OpenRouter API key for Claude models
- `TAVILY_API_KEY` — Tavily API key for web search

Optional:
- `OPENROUTER_BASE_URL` — Defaults to OpenRouter endpoint

## Tech Stack Quirks

- **Next.js 16.2.7** (App Router) — newer version with potential API changes
- **Tailwind CSS v4** — CSS-based config via `@import "tailwindcss"` in globals.css; no tailwind.config.js
- **shadcn/ui** — uses "new-york" style, components in `@/components/ui`
- **better-sqlite3** — synchronous SQLite API (not async)
- **React 19.2.4** — verify hook behavior differs from earlier versions

## Architecture

```
app/
├── api/
│   ├── chat/route.ts          # POST — SSE streaming chat endpoint
│   ├── chats/route.ts         # Chat CRUD
│   ├── chats/[id]/route.ts
│   └── workspaces/            # Workspace CRUD
components/                    # UI components
lib/
├── db/schema.ts              # SQLite: workspaces → chats → messages → embeddings
├── langchain/                # Chat model, reasoning chain, web search tool
└── vector-store/             # Embedding generation for cross-chat retrieval
```

## Streaming

Chat API uses SSE with event types:
- `{ type: 'reasoning', content: '...' }` — token-by-token reasoning
- `{ type: 'answer', content: '...' }` — final answer
- `{ type: 'tool', name: 'web_search', input: '...' }` — tool call
- `{ type: 'tool_result', ... }` — tool result
- `{ type: 'done', messageId, citations }` — completion

## Cross-Chat Retrieval

Embeddings stored in `message_embeddings` table. Retrieval uses cosine similarity (threshold 0.7) with keyword fallback. Top 3 results injected as context with chat titles.
