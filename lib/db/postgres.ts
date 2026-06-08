import { sql } from '@vercel/postgres';

let initialized = false;

export async function initDatabase() {
  if (initialized) return;
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS workspaces (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(255) NOT NULL DEFAULT '#6366f1',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS chats (
        id VARCHAR(255) PRIMARY KEY,
        workspace_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        chat_id VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        reasoning TEXT,
        citations TEXT,
        embedding_id VARCHAR(255),
        created_at BIGINT NOT NULL,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS message_embeddings (
        id VARCHAR(255) PRIMARY KEY,
        workspace_id VARCHAR(255) NOT NULL,
        chat_id VARCHAR(255) NOT NULL,
        message_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        embedding BYTEA NOT NULL,
        created_at BIGINT NOT NULL
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_chats_workspace ON chats(workspace_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_embeddings_workspace ON message_embeddings(workspace_id)`;
    
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

export { sql };
