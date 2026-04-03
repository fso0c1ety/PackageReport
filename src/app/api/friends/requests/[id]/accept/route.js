import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';
import { sendDirectNotification } from '@/lib/notificationHelper';

export const runtime = 'nodejs';

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query(
      "UPDATE friends SET status = 'accepted' WHERE id = $1 AND friend_id = $2 RETURNING *",
      [params.id, user.id]
    );
    if (result.rowCount === 0) return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    const friendship = result.rows[0];
    await sendDirectNotification(friendship.user_id, 'Friend Request Accepted', `${user.name} accepted your friend request.`, 'friend_accepted', { friendId: user.id });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error accepting friend request:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
