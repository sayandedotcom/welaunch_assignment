import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspaceId');
  const db = getDB();

  const chats = db.prepare(`
    SELECT id, workspace_id, title, created_at, updated_at FROM chats WHERE workspace_id = ? ORDER BY updated_at DESC
  `).all(workspaceId) as Array<{ id: string; workspace_id: string; title: string; created_at: number; updated_at: number }>;

  const mapped = chats.map(c => ({
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
  const db = getDB();
  const id = uuid();
  const now = Date.now();

  db.prepare(`
    INSERT INTO chats (id, workspace_id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, workspaceId, title || 'New Chat', now, now);

  return NextResponse.json({ id, workspaceId, title: title || 'New Chat', createdAt: now, updatedAt: now });
}