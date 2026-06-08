import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows } = await sql`SELECT * FROM messages WHERE chat_id = ${id} ORDER BY created_at ASC`;
  return NextResponse.json(rows);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM chats WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
