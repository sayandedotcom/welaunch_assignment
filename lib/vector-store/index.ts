import { OpenAIEmbeddings } from '@langchain/openai';

export function createEmbeddings() {
  return new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    model: 'text-embedding-3-small',
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
    },
  });
}
