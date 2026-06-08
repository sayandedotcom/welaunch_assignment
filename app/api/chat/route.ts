import { NextRequest } from 'next/server';
import { getDB } from '@/lib/db';
import { streamingReasoningChain, type StreamEvent } from '@/lib/langchain/chains/reasoning';
import { retrieveCrossChatContext, storeMessageEmbedding } from '@/lib/langchain/chains/cross-chat';
import { v4 as uuid } from 'uuid';

interface MessageRow {
  role: string;
  content: string;
}

const webSearchTool = {
  name: 'web_search',
  description: 'Search the web for current information. Returns snippets from search results with URLs.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query for web search' }
    },
    required: ['query']
  }
};

export async function POST(req: NextRequest) {
  const { chatId, message, workspaceId } = await req.json();
  const db = getDB();

  if (!chatId || !workspaceId || !message?.trim()) {
    return Response.json({ error: 'chatId, workspaceId, and message are required' }, { status: 400 });
  }

  const chat = db.prepare('SELECT id FROM chats WHERE id = ? AND workspace_id = ?').get(chatId, workspaceId);
  if (!chat) {
    return Response.json({ error: 'Chat not found in workspace' }, { status: 404 });
  }

  const crossChatContext = await retrieveCrossChatContext(workspaceId, message, db, chatId);

  const history = db.prepare(`
    SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC
  `).all(chatId) as MessageRow[];
  const chatHistory = history.map((m) => `${m.role}: ${m.content}`).join('\n');

  const userMsgId = uuid();
  db.prepare(`
    INSERT INTO messages (id, chat_id, role, content, created_at)
    VALUES (?, ?, 'user', ?, ?)
  `).run(userMsgId, chatId, message, Date.now());

  storeMessageEmbedding(db, workspaceId, chatId, userMsgId, message).catch(console.error);

  const contextStr = crossChatContext && crossChatContext.length > 0
    ? chatHistory + '\n\n[Cross-chat context from related conversations. If you use this context, cite the chat title explicitly.]:\n' + crossChatContext.map(c => 
      `- From "${c.chatTitle}": ${c.snippet}`
    ).join('\n')
    : chatHistory;

  const stream = streamingReasoningChain(message, contextStr, [webSearchTool]);

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let reasoningBuffer = '';
      let finalAnswerBuffer = '';
      const webSearchResults: string[] = [];

      for await (const event of stream) {
        const ev = event as StreamEvent;
        
        if (ev.type === 'reasoning') {
          reasoningBuffer = ev.content;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'reasoning', content: reasoningBuffer })}\n\n`));
        } else if (ev.type === 'answer') {
          finalAnswerBuffer = ev.content;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'answer', content: finalAnswerBuffer })}\n\n`));
        } else if (ev.type === 'tool') {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool', name: ev.name, input: ev.input })}\n\n`));
        } else if (ev.type === 'tool_result') {
          webSearchResults.push(ev.result);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool_result', name: ev.name, result: ev.result })}\n\n`));
        } else if (ev.type === 'done') {
          break;
        }
      }

      const citations = webSearchResults.length > 0 
        ? JSON.stringify({ webSearch: webSearchResults })
        : null;

      const assistantMsgId = uuid();
      db.prepare(`
        INSERT INTO messages (id, chat_id, role, content, reasoning, citations, created_at)
        VALUES (?, ?, 'assistant', ?, ?, ?, ?)
      `).run(assistantMsgId, chatId, finalAnswerBuffer, reasoningBuffer, citations, Date.now());

      storeMessageEmbedding(db, workspaceId, chatId, assistantMsgId, finalAnswerBuffer).catch(console.error);

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', messageId: assistantMsgId, citations: webSearchResults })}\n\n`));
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
