import { sql } from '@/lib/db/postgres';
import { createChatModel } from '../chat';
import { createEmbeddings } from '../../vector-store';

interface CrossChatResult {
  chatId: string;
  chatTitle: string;
  snippet: string;
  similarity: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;

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

async function getKeywordFallback(
  workspaceId: string,
  currentMessage: string,
  excludeChatId?: string
): Promise<CrossChatResult[] | null> {
  const { rows } = await sql`
    SELECT messages.chat_id, messages.content, chats.title AS chat_title
    FROM messages
    JOIN chats ON chats.id = messages.chat_id
    WHERE chats.workspace_id = ${workspaceId} AND messages.chat_id != ${excludeChatId || ''}
    ORDER BY messages.created_at DESC
    LIMIT 10
  `;

  if (rows.length === 0) return null;

  const keywords = currentMessage
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2);

  if (keywords.length === 0) return null;

  const scored = rows.map(row => {
    const contentLower = row.content.toLowerCase();
    const score = keywords.filter(k => contentLower.includes(k)).length;
    return {
      chatId: row.chat_id,
      chatTitle: row.chat_title || 'Untitled Chat',
      snippet: row.content.slice(0, 200),
      similarity: score / keywords.length
    };
  }).filter(r => r.similarity > 0.2);

  scored.sort((a, b) => b.similarity - a.similarity);
  const topResults = scored.slice(0, 3);
  return topResults.length > 0 ? topResults : null;
}

export async function retrieveCrossChatContext(
  workspaceId: string,
  currentMessage: string,
  excludeChatId?: string
): Promise<CrossChatResult[] | null> {
  try {
    const embeddings = createEmbeddings();
    const queryEmbedding = await embeddings.embedQuery(currentMessage);

    const { rows } = await sql`
      SELECT id, chat_id, content, embedding
      FROM message_embeddings
      WHERE workspace_id = ${workspaceId} AND chat_id != ${excludeChatId || ''}
    `;

    if (rows.length === 0) return null;

    const results: CrossChatResult[] = [];
    for (const row of rows) {
      if (!row.embedding || row.embedding.length === 0) continue;

      const embeddingBuffer = Buffer.from(row.embedding);
      const float32Array = new Float32Array(embeddingBuffer.length / 4);
      for (let i = 0; i < float32Array.length; i++) {
        float32Array[i] = embeddingBuffer.readFloatLE(i * 4);
      }
      const storedEmbedding = Array.from(float32Array);
      const similarity = cosineSimilarity(queryEmbedding, storedEmbedding);
      if (similarity > 0.7) {
        const { rows: chatRows } = await sql`
          SELECT title FROM chats WHERE id = ${row.chat_id}
        `;
        results.push({
          chatId: row.chat_id,
          chatTitle: chatRows[0]?.title || 'Untitled Chat',
          snippet: row.content.slice(0, 200),
          similarity,
        });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    const topResults = results.slice(0, 3);
    return topResults.length > 0
      ? topResults
      : await getKeywordFallback(workspaceId, currentMessage, excludeChatId);
  } catch {
    return await getKeywordFallback(workspaceId, currentMessage, excludeChatId);
  }
}

export async function storeMessageEmbedding(
  workspaceId: string,
  chatId: string,
  messageId: string,
  content: string
): Promise<void> {
  try {
    const embeddings = createEmbeddings();
    const embedding = await embeddings.embedQuery(content);
    const id = `emb_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);

    await sql`
      INSERT INTO message_embeddings (id, workspace_id, chat_id, message_id, content, embedding, created_at)
      VALUES (${id}, ${workspaceId}, ${chatId}, ${messageId}, ${content}, ${embeddingBuffer as unknown as string}, ${Date.now()})
    `;
  } catch (error) {
    console.error('Failed to store message embedding:', error);
  }
}

export async function generateWithCrossChatContext(
  userMessage: string,
  context: CrossChatResult[],
  chatHistory: string
) {
  const model = createChatModel();

  const contextPrompt = context.length > 0
    ? `Related to your previous conversations:\n${context.map((c) => `- ${c.chatTitle}: ${c.snippet}`).join('\n')}\n\n`
    : '';

  const response = await model.invoke([
    { role: 'system', content: 'You are a helpful AI assistant. When referencing previous conversations, cite them explicitly.' },
    { role: 'user', content: `${contextPrompt}Previous chat history:\n${chatHistory}\n\nCurrent question: ${userMessage}` }
  ]);

  return response.content.toString();
}
