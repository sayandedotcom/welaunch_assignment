import { OpenAIEmbeddings } from '@langchain/openai';

export function createEmbeddings() {
  return new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    },
    model: 'google/gemini-2.0-flash-001',
  });
}
