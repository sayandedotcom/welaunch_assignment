import { z } from 'zod';
import { DynamicTool } from '@langchain/core/tools';

const searchSchema = z.object({
  query: z.string().describe('Search query for web search'),
});

export function createWebSearchTool() {
  return new DynamicTool({
    name: 'web_search',
    description: 'Search the web for current information. Returns snippets from search results.',
    schema: searchSchema,
    async func({ query }) {
      const response = await fetch(
        `https://openrouter.ai/api/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.0-flash-001',
            messages: [{
              role: 'user',
              content: `Search the web for: ${query}. Return the top 5 results with titles, URLs, and brief summaries.`
            }]
          })
        }
      );
      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No results found';
    },
  });
}