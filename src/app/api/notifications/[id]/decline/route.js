import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await db.query('DELETE FROM notifications WHERE id = $1 AND recipient_id = $2', [params.id, user.id]);
    return NextResponse.json({ success: true, message: 'Invite declined' });
  } catch (err) {
    console.error('Error declining invite:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
