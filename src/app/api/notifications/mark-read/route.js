import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await db.query('UPDATE notifications SET read = true WHERE recipient_id = $1', [user.id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error marking notifications read:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
