import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  try {
    const result = await db.query('SELECT * FROM automations WHERE table_id = $1 ORDER BY id DESC', [params.tableId]);
    const mapped = result.rows.map((row) => ({
      id: row.id,
      tableId: row.table_id,
      taskIds: row.task_ids || (row.task_id ? [row.task_id] : []),
      triggerCol: row.trigger_col,
      enabled: row.enabled,
      recipients: row.recipients,
      cols: row.cols,
      actionType: row.action_type || 'email',
    }));
    return NextResponse.json(mapped);
  } catch (err) {
    console.error('Error fetching automations:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const { id, triggerCol, cols, recipients, enabled, taskIds, actionType } = await req.json();
  try {
    if (id) {
      await db.query(`
        UPDATE automations SET trigger_col = $1, enabled = $2, recipients = $3, cols = $4, action_type = $5, task_ids = $6
        WHERE id = $7 AND table_id = $8
      `, [triggerCol, enabled, JSON.stringify(recipients || []), JSON.stringify(cols || []), actionType || 'email', JSON.stringify(taskIds || []), id, params.tableId]);
    } else {
      await db.query(`
        INSERT INTO automations (table_id, task_ids, trigger_col, enabled, recipients, cols, action_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [params.tableId, JSON.stringify(taskIds || []), triggerCol, enabled, JSON.stringify(recipients || []), JSON.stringify(cols || []), actionType || 'email']);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error saving automation:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
