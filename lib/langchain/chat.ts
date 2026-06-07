import { ChatOpenAI } from '@langchain/openai';

export function createChatModel(model = 'google/gemini-2.0-flash-001') {
  return new ChatOpenAI({
    model,
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    },
    streaming: true,
    temperature: 0.7,
  });
}

export function createReasoningModel() {
  return createChatModel('google/gemini-2.0-flash-001');
}

export function createStrongModel() {
  return createChatModel('anthropic/claude-3.5-sonnet');
}
