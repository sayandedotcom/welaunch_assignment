import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();
  const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
  if (!workspace) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(workspace);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, color } = await req.json();
  const db = getDB();

  db.prepare(`
    UPDATE workspaces SET name = ?, color = ?, updated_at = ? WHERE id = ?
  `).run(name, color, Date.now(), id);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();
  db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}