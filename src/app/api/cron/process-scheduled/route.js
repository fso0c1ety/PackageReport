import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { sendNotification } from '@/lib/notificationHelper';

export const runtime = 'nodejs';

export async function GET(req) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let processed = 0;
  try {
    const result = await db.query(`
      SELECT r.id, r.table_id, r.values
      FROM rows r
      WHERE r.values::text LIKE '%"scheduledFor"%'
    `);

    for (const row of result.rows) {
      const messages = row.values.message;
      if (!Array.isArray(messages)) continue;

      const tableRes = await db.query('SELECT * FROM tables WHERE id = $1', [row.table_id]);
      const table = tableRes.rows[0];
      if (!table) continue;

      let changed = false;
      for (const msg of messages) {
        if (msg.scheduledFor && !msg.notificationSent && new Date(msg.scheduledFor) <= new Date()) {
          let taskName = 'Task';
          if (Array.isArray(table.columns)) {
            const taskCol = table.columns.find((c) => c.id === 'task') || table.columns[0];
            if (taskCol && row.values[taskCol.id]) taskName = row.values[taskCol.id];
          }
          await sendNotification('New Discussion', `${msg.sender || 'System'} commented on the ${taskName}: ${msg.text}`, 'task_chat', { taskId: row.id }, table, null);
          msg.notificationSent = true;
          changed = true;
          processed++;
        }
      }
      if (changed) {
        await db.query('UPDATE rows SET values = $1 WHERE id = $2', [JSON.stringify(row.values), row.id]);
      }
    }
    return NextResponse.json({ success: true, processed });
  } catch (err) {
    console.error('[Cron] Error processing scheduled messages:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
