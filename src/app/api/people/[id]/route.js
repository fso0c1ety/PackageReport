import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  try {
    const result = await db.query('SELECT id, name, email, avatar FROM users WHERE id = $1', [params.id]);
    if (result.rows.length === 0) {
      return NextResponse.json({
        id: params.id,
        name: 'Unknown user',
        email: null,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent('Unknown User')}&background=random&color=fff&bold=true`,
        missing: true,
      });
    }
    const user = result.rows[0];
    return NextResponse.json({
      ...user,
      avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true`,
    });
  } catch (err) {
    console.error('Error fetching person:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
