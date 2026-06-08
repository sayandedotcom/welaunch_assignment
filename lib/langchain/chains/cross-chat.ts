import Database from 'better-sqlite3';
import { createChatModel } from '../chat';
import { createEmbeddings } from '../../vector-store';

interface CrossChatResult {
  chatId: string;
  chatTitle: string;
  snippet: string;
  similarity: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function retrieveCrossChatContext(
  workspaceId: string,
  currentMessage: string,
  db: Database.Database
): Promise<CrossChatResult[] | null> {
  try {
    const embeddings = createEmbeddings();
    const queryEmbedding = await embeddings.embedQuery(currentMessage);

    const rows = db.prepare(`
      SELECT id, chat_id, content, embedding
      FROM message_embeddings
      WHERE workspace_id = ?
    `).all(workspaceId) as Array<{
      id: string;
      chat_id: string;
      content: string;
      embedding: Buffer;
    }>;

    if (rows.length === 0) return null;

    const results: CrossChatResult[] = [];
    for (const row of rows) {
      const float32Array = new Float32Array(row.embedding.length / 4);
      for (let i = 0; i < float32Array.length; i++) {
        float32Array[i] = row.embedding.readFloatLE(i * 4);
      }
      const storedEmbedding = Array.from(float32Array);
      const similarity = cosineSimilarity(queryEmbedding, storedEmbedding);
      if (similarity > 0.7) {
        const chatRow = db.prepare('SELECT title FROM chats WHERE id = ?').get(row.chat_id) as { title: string } | undefined;
        results.push({
          chatId: row.chat_id,
          chatTitle: chatRow?.title || 'Untitled Chat',
          snippet: row.content.slice(0, 200),
          similarity,
        });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, 3);
  } catch {
    const rows = db.prepare(`
      SELECT chat_id, content
      FROM message_embeddings
      WHERE workspace_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `).all(workspaceId) as Array<{
      chat_id: string;
      content: string;
    }>;

    if (rows.length === 0) return null;

    const keywords = currentMessage.toLowerCase().split(/\s+/);
    const scored = rows.map(row => {
      const contentLower = row.content.toLowerCase();
      const score = keywords.filter(k => contentLower.includes(k)).length;
      const chatRow = db.prepare('SELECT title FROM chats WHERE id = ?').get(row.chat_id) as { title: string } | undefined;
      return { chatId: row.chat_id, chatTitle: chatRow?.title || 'Untitled Chat', snippet: row.content.slice(0, 200), similarity: score / keywords.length };
    }).filter(r => r.similarity > 0.2);

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, 3);
  }
}

export async function storeMessageEmbedding(
  db: Database.Database,
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

    db.prepare(`
      INSERT INTO message_embeddings (id, workspace_id, chat_id, message_id, content, embedding, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, workspaceId, chatId, messageId, content, embeddingBuffer, Date.now());
  } catch {
    const id = `emb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    db.prepare(`
      INSERT INTO message_embeddings (id, workspace_id, chat_id, message_id, content, embedding, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, workspaceId, chatId, messageId, content, Buffer.alloc(0), Date.now());
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