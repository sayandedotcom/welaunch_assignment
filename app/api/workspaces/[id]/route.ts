import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows } = await sql`SELECT * FROM workspaces WHERE id = ${id}`;
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, color } = await req.json();

  await sql`
    UPDATE workspaces SET name = ${name}, color = ${color}, updated_at = ${Date.now()} WHERE id = ${id}
  `;

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM workspaces WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
