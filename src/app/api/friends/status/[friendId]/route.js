import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query(
      `SELECT status, user_id as sender_id FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1) LIMIT 1`,
      [user.id, params.friendId]
    );
    if (result.rowCount === 0) return NextResponse.json({ status: 'none', sender_id: null });
    return NextResponse.json({ status: result.rows[0].status, sender_id: result.rows[0].sender_id });
  } catch (err) {
    console.error('Error fetching friend status:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
