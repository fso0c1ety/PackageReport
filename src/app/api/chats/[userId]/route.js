import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';
import { sendPushNotification } from '@/lib/firebase';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query(
      `SELECT * FROM direct_messages WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1) ORDER BY timestamp ASC`,
      [user.id, params.userId]
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
  if (user.id === params.userId) return NextResponse.json({ error: 'You cannot message yourself' }, { status: 400 });
  try {
    const newMessage = { id: uuidv4(), sender_id: user.id, recipient_id: params.userId, text, timestamp: new Date(), read: false };
    await db.query(
      'INSERT INTO direct_messages (id, sender_id, recipient_id, text, timestamp, read) VALUES ($1, $2, $3, $4, $5, $6)',
      [newMessage.id, newMessage.sender_id, newMessage.recipient_id, newMessage.text, newMessage.timestamp, newMessage.read]
    );

    const notifId = uuidv4();
    await db.query(
      'INSERT INTO notifications (id, recipient_id, sender_id, type, data, read, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [notifId, newMessage.recipient_id, newMessage.sender_id, 'direct_message', JSON.stringify({ text: newMessage.text }), false]
    );

    const recipientRes = await db.query('SELECT fcm_token FROM users WHERE id = $1', [params.userId]);
    const senderRes = await db.query('SELECT name FROM users WHERE id = $1', [user.id]);
    const token = recipientRes.rows[0]?.fcm_token;
    const senderName = senderRes.rows[0]?.name || 'Someone';
    if (token) {
      await sendPushNotification([token], 'New Message', `${senderName}: ${newMessage.text}`, { type: 'direct_message', senderId: user.id });
    }
    return NextResponse.json(newMessage);
  } catch (err) {
    console.error('Error sending message:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
