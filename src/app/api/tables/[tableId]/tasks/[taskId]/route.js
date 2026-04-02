import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  try {
    const result = await db.query('SELECT * FROM rows WHERE id = $1 AND table_id = $2', [params.taskId, params.tableId]);
    if (!result.rows[0]) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching task:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const result = await db.query('DELETE FROM rows WHERE id = $1 AND table_id = $2', [params.taskId, params.tableId]);
    if (result.rowCount === 0) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
