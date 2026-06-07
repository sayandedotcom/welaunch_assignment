export interface Workspace {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface Chat {
  id: string;
  workspaceId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  citations?: string[];
  createdAt: number;
}
