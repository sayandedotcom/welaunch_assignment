# AI Chat - Multi-Workspace Chat Application

A production-ready AI chat application with streaming reasoning, real-time web search, and cross-chat contextual retrieval.

## Features

### Multi-Workspace Architecture
- Create and switch between multiple isolated workspaces
- Each workspace has its own color coding and chat sessions
- Full CRUD operations for workspaces

### Real-Time Web-Connected Responses
- Custom Tavily API integration (no SDK plugins)
- AI automatically searches the web when current information is needed
- Visible "🌐 Searching the web..." indicator during fetch
- Citations displayed below responses

### Streaming Reasoning
- Token-by-token streaming for real-time responses
- Visible chain-of-thought reasoning separated from final answer
- Reasoning appears in real-time as the model thinks

### Chat History & Persistence
- SQLite-based persistent storage per workspace
- Full conversation history within each chat
- Sidebar browsing of all chats

### Cross-Chat Contextual Awareness
- Semantic retrieval via embeddings (with keyword fallback)
- Automatically detects related context from previous chats in same workspace
- Context citations in responses

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** SQLite with better-sqlite3
- **AI:** OpenRouter API (Claude models)
- **Web Search:** Tavily API
- **Styling:** Tailwind CSS + shadcn/ui
- **Language:** TypeScript

## Architecture

```
app/
├── api/
│   ├── chat/route.ts          # Streaming chat endpoint
│   ├── chats/route.ts         # Chat CRUD
│   └── workspaces/route.ts    # Workspace CRUD
components/
├── AppSidebar.tsx             # Workspace & chat navigation
├── ChatBlock.tsx              # Main chat interface
├── ChatMessage.tsx            # Message display with reasoning
└── ChatInput.tsx              # Message input
context/
├── ChatContext.tsx            # Chat state management
└── WorkspaceContext.tsx       # Workspace state management
lib/
├── db/
│   └── schema.ts              # SQLite schema
├── langchain/
│   ├── chat.ts                # Model configuration
│   ├── chains/
│   │   ├── reasoning.ts       # Streaming + tool execution
│   │   └── cross-chat.ts      # Semantic retrieval
│   └── tools/
│       └── web-search.ts      # Tavily integration
└── vector-store/
    └── index.ts               # Embedding generation
```

## Environment Variables

```env
# Required
OPENROUTER_API_KEY=sk-or-v1-...      # OpenRouter API key
TAVILY_API_KEY=tvly-...              # Tavily API key for web search

# Optional
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1  # Default: OpenRouter
```

### Getting API Keys

1. **OpenRouter:** https://openrouter.ai/keys
2. **Tavily:** https://app.tavily.com/home

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Production build
npm run build
npm start
```

## Cost Strategy

- **Model:** Claude 3.5 Haiku (~ $0.80/1M tokens) for cost efficiency
- **Context:** Automatic cross-chat retrieval reduces redundant API calls
- **Web Search:** Only triggers when real-time info needed
- **Hard Cap:** Set $8 budget limit in OpenRouter dashboard

## Streaming Implementation

The streaming uses Server-Sent Events (SSE) with proper event types:

```typescript
{ type: 'reasoning', content: '...' }  // Real-time reasoning
{ type: 'answer', content: '...' }      // Real-time answer
{ type: 'tool', name: 'web_search', input: '...' }     // Tool call started
{ type: 'tool_result', name: 'web_search', result: '...' }  // Tool result
{ type: 'done', messageId: '...' }      // Completion
```

## Cross-Chat Retrieval

1. User message embedded using OpenAI's embedding model via OpenRouter
2. Cosine similarity against all previous messages in workspace
3. Threshold: 0.7 for semantic match, keyword fallback for lower
4. Top 3 results injected as context with chat titles

## License

MIT