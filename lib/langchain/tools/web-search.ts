import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';

const searchSchema = z.object({
  query: z.string().describe('Search query for web search'),
});

interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

export function createWebSearchTool() {
  return new DynamicStructuredTool({
    name: 'web_search',
    description: 'Search the web for current information. Returns snippets from search results.',
    schema: searchSchema,
    func: async ({ query }) => {
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

      const data = await response.json() as { results: TavilyResult[] };

      if (!data.results || data.results.length === 0) {
        return 'No results found';
      }

      return data.results
        .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.content.slice(0, 200)}...`)
        .join('\n\n');
    },
  });
}
