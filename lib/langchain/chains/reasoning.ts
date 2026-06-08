export type StreamEvent = 
  | { type: 'reasoning'; content: string }
  | { type: 'answer'; content: string }
  | { type: 'tool'; name: string; input: string }
  | { type: 'tool_result'; name: string; result: string }
  | { type: 'done'; messageId?: string };

interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

const CHAT_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.7-sonnet';

function getReasoningDelta(delta: Record<string, unknown> | undefined): string {
  if (!delta) return '';

  if (typeof delta.reasoning === 'string') {
    return delta.reasoning;
  }

  if (Array.isArray(delta.reasoning_details)) {
    return delta.reasoning_details
      .map((detail) => {
        if (typeof detail === 'string') return detail;
        if (detail && typeof detail === 'object') {
          const typedDetail = detail as { text?: unknown; content?: unknown; summary?: unknown };
          if (typeof typedDetail.text === 'string') return typedDetail.text;
          if (typeof typedDetail.content === 'string') return typedDetail.content;
          if (typeof typedDetail.summary === 'string') return typedDetail.summary;
        }
        return '';
      })
      .join('');
  }

  return '';
}

export async function* streamingReasoningChain(
  userMessage: string, 
  context?: string,
  tools?: Array<{ name: string; description: string; parameters: Record<string, unknown> }>
) {
  const systemPrompt = context
    ? `You are a helpful AI assistant with web search capabilities. Previous conversation context:\n${context}`
    : 'You are a helpful AI assistant with web search capabilities. Use the web_search tool when you need current information.';

  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  const toolDefinitions = tools?.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }
  })) || [];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
      stream: true,
      include_reasoning: true,
      reasoning: { enabled: true, effort: 'medium' },
      max_tokens: 2000,
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
  
  const pendingTools: Map<number, ToolCall> = new Map();
  let currentToolIndex = -1;
  const toolCallResults: string[] = [];

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
        const delta = parsed.choices?.[0]?.delta;

        const reasoningDelta = getReasoningDelta(delta);
        if (reasoningDelta) {
          reasoningBuffer += reasoningDelta;
          yield { type: 'reasoning', content: reasoningBuffer } as StreamEvent;
        }

        if (delta?.content) {
          answerBuffer += delta.content;
          yield { type: 'answer', content: answerBuffer } as StreamEvent;
        }

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index ?? currentToolIndex + 1;
            currentToolIndex = index;
            
            if (toolCall.function?.name) {
              const tool: ToolCall = {
                id: toolCall.id || `tool_${index}`,
                name: toolCall.function.name,
                arguments: ''
              };
              pendingTools.set(index, tool);
            }
            
            if (toolCall.function?.arguments && pendingTools.has(index)) {
              const tool = pendingTools.get(index)!;
              tool.arguments += toolCall.function.arguments;
            }
          }
        }
      } catch {
        // Skip malformed JSON
      }
    }

    for (const [index, tool] of pendingTools) {
      try {
        const args = JSON.parse(tool.arguments);
        
        if (tool.name === 'web_search') {
          yield { type: 'tool', name: 'web_search', input: args.query } as StreamEvent;
          
          const result = await executeWebSearch(args.query);
          yield { type: 'tool_result', name: 'web_search', result } as StreamEvent;
          toolCallResults.push(result);
          
          messages.push({
            role: 'assistant',
            content: '',
            tool_calls: [{
              id: tool.id,
              function: { name: tool.name, arguments: tool.arguments },
              type: 'function'
            }]
          });
          
          messages.push({
            role: 'tool',
            tool_call_id: tool.id,
            content: result
          });
          
          pendingTools.delete(index);
          
          const continuation = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            },
            body: JSON.stringify({
              model: CHAT_MODEL,
              messages,
              stream: true,
              include_reasoning: true,
              reasoning: { enabled: true, effort: 'medium' },
              max_tokens: 2000,
            }),
          });

          if (continuation.ok) {
            const contReader = continuation.body?.getReader();
            let contBuffer = '';
            let contDone = false;

            while (contReader && !contDone) {
              const { done, value } = await contReader.read();
              if (done) { contDone = true; break; }

              contBuffer += decoder.decode(value, { stream: true });
              const contLines = contBuffer.split('\n');
              contBuffer = contLines.pop() || '';

              for (const contLine of contLines) {
                if (!contLine.startsWith('data: ')) continue;
                const contData = contLine.slice(6);
                if (contData === '[DONE]') { contDone = true; break; }

                try {
                  const contParsed = JSON.parse(contData);
                  const contDelta = contParsed.choices?.[0]?.delta;

                  const reasoningDelta = getReasoningDelta(contDelta);
                  if (reasoningDelta) {
                    reasoningBuffer += reasoningDelta;
                    yield { type: 'reasoning', content: reasoningBuffer } as StreamEvent;
                  }

                  if (contDelta?.content) {
                    answerBuffer += contDelta.content;
                    yield { type: 'answer', content: answerBuffer } as StreamEvent;
                  }
                } catch {
                  // Skip
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Tool execution error:', e);
      }
    }
  }
}

async function executeWebSearch(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return 'Web search not configured. Set TAVILY_API_KEY environment variable.';
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: false,
      include_raw_content: false,
    }),
  });

  if (!response.ok) {
    return `Search failed: ${response.statusText}`;
  }

  const data = await response.json() as { results: Array<{ title: string; url: string; content: string }> };

  if (!data.results || data.results.length === 0) {
    return 'No results found';
  }

  return data.results
    .map((r, i) => `[${i + 1}] ${r.title}\n   URL: ${r.url}\n   ${r.content.slice(0, 300)}...`)
    .join('\n\n');
}
