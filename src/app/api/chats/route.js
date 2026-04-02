import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query(
      `WITH last_messages AS (
        SELECT
          CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END as other_user_id,
          text, timestamp,
          ROW_NUMBER() OVER(PARTITION BY CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END ORDER BY timestamp DESC) as rn
        FROM direct_messages
        WHERE sender_id = $1 OR recipient_id = $1
      )
      SELECT u.id, u.name, u.email, u.avatar, lm.text as last_message, lm.timestamp
      FROM last_messages lm
      JOIN users u ON u.id = lm.other_user_id
      WHERE lm.rn = 1
      ORDER BY lm.timestamp DESC`,
      [user.id]
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
