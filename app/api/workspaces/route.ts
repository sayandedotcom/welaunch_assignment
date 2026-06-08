import { NextRequest, NextResponse } from 'next/server';
import { sql, initDatabase } from '@/lib/db/postgres';
import { v4 as uuid } from 'uuid';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export async function GET() {
  await initDatabase();
  const { rows } = await sql`SELECT * FROM workspaces ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  await initDatabase();
  const { name } = await req.json();
  const id = uuid();
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const now = Date.now();

  await sql`
    INSERT INTO workspaces (id, name, color, created_at, updated_at)
    VALUES (${id}, ${name}, ${color}, ${now}, ${now})
  `;

  return NextResponse.json({ id, name, color, createdAt: now, updatedAt: now });
}
