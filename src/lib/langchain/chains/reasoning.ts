import { createReasoningModel, createWebSearchTool, createWebFetchTool } from '../index';

export async function* streamingReasoningChain(userMessage: string, context?: string) {
  const model = createReasoningModel();
  const webSearch = createWebSearchTool();
  const webFetch = createWebFetchTool();

  const tools = [webSearch, webFetch];
  const modelWithTools = model.bindTools(tools);

  let reasoningBuffer = '';
  let finalAnswerBuffer = '';
  let inReasoning = false;

  const systemPrompt = context
    ? `You are a helpful AI assistant. Previous conversation context:\n${context}\n\nWhen reasoning, prefix with [REASONING] and end with [END_REASONING].`
    : 'You are a helpful AI assistant. When reasoning, prefix with [REASONING] and end with [END_REASONING].';

  const stream = await modelWithTools.stream([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ]);

  for await (const chunk of stream) {
    const content = chunk.content.toString();

    if (content.includes('[REASONING]')) {
      inReasoning = true;
    }

    if (inReasoning) {
      reasoningBuffer += content;
      yield `reasoning:${reasoningBuffer}`;
    }

    if (content.includes('[END_REASONING]')) {
      inReasoning = false;
      reasoningBuffer = reasoningBuffer.replace('[REASONING]', '').replace('[END_REASONING]', '');
      yield `reasoning:${reasoningBuffer}`;
    }

    if (!inReasoning && !content.includes('[REASONING]') && !content.includes('[END_REASONING]')) {
      finalAnswerBuffer += content;
      yield `answer:${finalAnswerBuffer}`;
    }
  }
}