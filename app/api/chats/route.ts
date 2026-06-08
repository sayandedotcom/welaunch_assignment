import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { v4 as uuid } from 'uuid';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspaceId');

  const { rows } = await sql`
    SELECT id, workspace_id, title, created_at, updated_at FROM chats WHERE workspace_id = ${workspaceId} ORDER BY updated_at DESC
  `;

  const mapped = rows.map(c => ({
    id: c.id,
    workspaceId: c.workspace_id,
    title: c.title,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));

  return NextResponse.json(mapped);
}

export async function POST(req: NextRequest) {
  const { workspaceId, title } = await req.json();
  const id = uuid();
  const now = Date.now();

  await sql`
    INSERT INTO chats (id, workspace_id, title, created_at, updated_at)
    VALUES (${id}, ${workspaceId}, ${title || 'New Chat'}, ${now}, ${now})
  `;

  return NextResponse.json({ id, workspaceId, title: title || 'New Chat', createdAt: now, updatedAt: now });
}
