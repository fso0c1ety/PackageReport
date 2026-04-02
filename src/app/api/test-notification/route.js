import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';
import { sendPushNotification } from '@/lib/firebase';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const userRes = await db.query('SELECT fcm_token, fcm_tokens FROM users WHERE id = $1', [user.id]);
    if (userRes.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 400 });
    const r = userRes.rows[0];
    let tokens = new Set();
    if (r.fcm_token) tokens.add(r.fcm_token);
    if (Array.isArray(r.fcm_tokens)) r.fcm_tokens.forEach((t) => { if (t) tokens.add(t); });
    const tokensArray = Array.from(tokens);
    if (tokensArray.length === 0) return NextResponse.json({ error: 'No FCM tokens found for user' }, { status: 400 });
    await sendPushNotification(tokensArray, 'Test Notification', 'This is a test from SmartManage!');
    return NextResponse.json({ success: true, message: 'Notification sent' });
  } catch (err) {
    console.error('Error sending test notification:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
