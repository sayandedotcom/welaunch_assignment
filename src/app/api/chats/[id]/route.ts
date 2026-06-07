import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();
  const messages = db.prepare(`
    SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC
  `).all(id);
  return NextResponse.json(messages);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();
  db.prepare('DELETE FROM chats WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}