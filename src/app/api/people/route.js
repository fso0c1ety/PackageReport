import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q');
    let result;
    if (search) {
      result = await db.query(
        'SELECT id, name, email, avatar FROM users WHERE name ILIKE $1 OR email ILIKE $1 LIMIT 10',
        [`%${search}%`]
      );
    } else {
      result = await db.query('SELECT id, name, email, avatar FROM users LIMIT 10');
    }
    const users = result.rows.map((u) => ({
      ...u,
      avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&color=fff&bold=true`,
    }));
    return NextResponse.json(users);
  } catch (err) {
    console.error('Error fetching people:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  const { name, email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  try {
    const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rowCount === 0) {
      await db.query('INSERT INTO users (id, name, email) VALUES ($1, $2, $3)', [uuidv4(), name, email]);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error adding person:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
