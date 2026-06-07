import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { v4 as uuid } from 'uuid';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export async function GET() {
  const db = getDB();
  const workspaces = db.prepare('SELECT * FROM workspaces ORDER BY created_at DESC').all();
  return NextResponse.json(workspaces);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  const db = getDB();
  const id = uuid();
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const now = Date.now();

  db.prepare(`
    INSERT INTO workspaces (id, name, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, color, now, now);

  return NextResponse.json({ id, name, color, createdAt: now, updatedAt: now });
}