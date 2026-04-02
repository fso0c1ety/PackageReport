import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { sendDirectNotification } from '@/lib/notificationHelper';

export const runtime = 'nodejs';

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { callerName, callerAvatar, isVideo } = await req.json();
  try {
    await sendDirectNotification(
      params.userId,
      'Incoming Call',
      `${callerName || 'Someone'} is calling you via ${isVideo ? 'Video' : 'Audio'}.`,
      'incoming_call',
      { callerId: user.id, callerName, callerAvatar, isVideo }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error triggering call push notification:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
