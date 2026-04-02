import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query(
      'DELETE FROM friends WHERE id = $1 AND (user_id = $2 OR friend_id = $2)',
      [params.id, user.id]
    );
    if (result.rowCount === 0) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error rejecting friend request:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
