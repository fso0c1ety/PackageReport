import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query(
      'SELECT id, name, email, avatar, phone, job_title, company FROM users WHERE id = $1',
      [user.id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching profile:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, avatar, phone, job_title, company } = await req.json();
  try {
    const result = await db.query(
      'UPDATE users SET name = $1, avatar = $2, phone = $3, job_title = $4, company = $5 WHERE id = $6 RETURNING id, name, email, avatar, phone, job_title, company',
      [name, avatar, phone, job_title, company, user.id]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: 'User not found or not updated' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating profile:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
