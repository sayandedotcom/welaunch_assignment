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