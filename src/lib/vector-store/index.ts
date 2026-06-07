import { OpenAIEmbeddings } from '@langchain/openai';

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