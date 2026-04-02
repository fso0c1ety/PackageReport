import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';
import { sendDirectNotification } from '@/lib/notificationHelper';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { friendId } = await req.json();
  if (!friendId) return NextResponse.json({ error: 'Friend ID is required' }, { status: 400 });
  if (user.id === friendId) return NextResponse.json({ error: 'Cannot add yourself as friend' }, { status: 400 });
  try {
    const id = uuidv4();
    const result = await db.query(
      `WITH ins AS (
        INSERT INTO friends (id, user_id, friend_id, status, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, friend_id) DO NOTHING
        RETURNING id
       )
       SELECT id FROM ins
       UNION ALL
       SELECT id FROM friends WHERE user_id = $2 AND friend_id = $3
       LIMIT 1`,
      [id, user.id, friendId, 'pending', new Date()]
    );
    const requestId = result.rows[0].id;
    await sendDirectNotification(friendId, 'New Friend Request', `${user.name} sent you a friend request.`, 'friend_request', { friendId: user.id, requestId });
    return NextResponse.json({ success: true, requestId });
  } catch (err) {
    console.error('Error sending friend request:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
