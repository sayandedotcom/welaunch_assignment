import { ChatOpenAI } from '@langchain/openai';

const originalOpenAIKey = process.env.OPENAI_API_KEY;

export function createChatModel(model = 'anthropic/claude-3.5-haiku') {
  process.env.OPENAI_API_KEY = process.env.OPENROUTER_API_KEY;

  const chatModel = new ChatOpenAI({
    model,
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    },
    streaming: true,
    temperature: 0.7,
  });

  if (originalOpenAIKey !== undefined) {
    process.env.OPENAI_API_KEY = originalOpenAIKey;
  }

  return chatModel;
}

export function createReasoningModel() {
  return createChatModel('anthropic/claude-3.5-haiku');
}

export function createStrongModel() {
  return createChatModel('anthropic/claude-3.5-sonnet');
}
