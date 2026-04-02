import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const wsResult = await db.query('SELECT id FROM workspaces WHERE owner_id = $1', [user.id]);
    const userWorkspaceIds = wsResult.rows.map((ws) => ws.id);
    if (userWorkspaceIds.length === 0) return NextResponse.json([]);

    const tablesResult = await db.query('SELECT id FROM tables WHERE workspace_id = ANY($1)', [userWorkspaceIds]);
    const userTableIds = tablesResult.rows.map((t) => t.id);
    if (userTableIds.length === 0) return NextResponse.json([]);

    const logsResult = await db.query(
      'SELECT * FROM activity_logs WHERE table_id = ANY($1) ORDER BY timestamp DESC LIMIT 20',
      [userTableIds]
    );
    const mappedLogs = logsResult.rows.map((log) => ({
      id: log.id,
      recipients: log.recipients,
      subject: log.subject,
      html: log.html,
      timestamp: log.timestamp,
      tableId: log.table_id,
      taskId: log.task_id,
      status: log.status,
      errorMessage: log.error_message,
    }));
    return NextResponse.json(mappedLogs);
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
