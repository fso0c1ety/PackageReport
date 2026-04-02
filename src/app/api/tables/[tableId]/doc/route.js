import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function PUT(req, { params }) {
  try {
    const { content } = await req.json();
    await db.query('UPDATE tables SET doc_content = $1 WHERE id = $2', [content, params.tableId]);
    return NextResponse.json({ success: true, content });
  } catch (err) {
    console.error('Error updating document content:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
