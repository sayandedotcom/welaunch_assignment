import { z } from 'zod';
import { DynamicTool } from '@langchain/core/tools';

const fetchSchema = z.object({
  url: z.string().url().describe('URL to fetch content from'),
  query: z.string().optional().describe('Specific information to extract'),
});

export function createWebFetchTool() {
  return new DynamicTool({
    name: 'web_fetch',
    description: 'Fetch content from a specific URL. Useful for getting detailed information from search results.',
    schema: fetchSchema,
    async func({ url, query }) {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AI-Chat/1.0)'
        }
      });
      const text = await response.text();
      if (query) {
        return `Information about ${query}: ${text.slice(0, 2000)}`;
      }
      return text.slice(0, 3000);
    },
  });
}