import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { streamingReasoningChain } from '@/lib/langchain/chains/reasoning';
import { retrieveCrossChatContext } from '@/lib/langchain/chains/cross-chat';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  const { chatId, message, workspaceId } = await req.json();
  const db = getDB();

  const crossChatContext = await retrieveCrossChatContext(workspaceId, message, db);

  const history = db.prepare(`
    SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC
  `).all(chatId);
  const chatHistory = history.map((m: any) => `${m.role}: ${m.content}`).join('\n');

  const userMsgId = uuid();
  db.prepare(`
    INSERT INTO messages (id, chat_id, role, content, created_at)
    VALUES (?, ?, 'user', ?, ?)
  `).run(userMsgId, chatId, message, Date.now());

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