export async function* streamingReasoningChain(userMessage: string, context?: string) {
  const systemPrompt = context
    ? `You are a helpful AI assistant. Previous conversation context:\n${context}`
    : 'You are a helpful AI assistant.';

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-haiku',
      messages,
      stream: true,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error: ${response.status} - ${error}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let reasoningBuffer = '';
  let answerBuffer = '';
  let inReasoning = false;

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || '';

        if (content.includes('[REASONING]')) {
          inReasoning = true;
        }

        if (inReasoning) {
          reasoningBuffer += content.replace('[REASONING]', '').replace('[END_REASONING]', '');
          yield `reasoning:${reasoningBuffer}`;
        }

        if (content.includes('[END_REASONING]')) {
          inReasoning = false;
          yield `reasoning:${reasoningBuffer}`;
        }

        if (!inReasoning && !content.includes('[REASONING]') && !content.includes('[END_REASONING]')) {
          answerBuffer += content;
          yield `answer:${answerBuffer}`;
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }
}