import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE(req, { params }) {
  try {
    await db.query('DELETE FROM automations WHERE id = $1 AND table_id = $2', [params.id, params.tableId]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting automation:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
