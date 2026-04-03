import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function PUT(req, { params }) {
  const { orderedTaskIds } = await req.json();
  if (!Array.isArray(orderedTaskIds)) return NextResponse.json({ error: 'orderedTaskIds must be array' }, { status: 400 });
  try {
    for (let i = 0; i < orderedTaskIds.length; i++) {
      await db.query(
        `UPDATE rows SET values = jsonb_set(COALESCE(values, '{}'::jsonb), '{order}', $1::jsonb) WHERE id = $2 AND table_id = $3`,
        [JSON.stringify(i), orderedTaskIds[i], params.tableId]
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error ordering tasks:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
