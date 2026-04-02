import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req) {
  const { name, email, password } = await req.json();
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const existingUser = result.rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true`;

    if (existingUser) {
      if (existingUser.password) return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      await db.query('UPDATE users SET name = $1, password = $2, avatar = $3 WHERE id = $4', [name, hashedPassword, avatarUrl, existingUser.id]);
      return NextResponse.json({ success: true, message: 'Account updated with password and avatar successfully' });
    }

    const userId = uuidv4();
    await db.query('INSERT INTO users (id, name, email, avatar, password) VALUES ($1, $2, $3, $4, $5)', [userId, name, email, avatarUrl, hashedPassword]);
    return NextResponse.json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Internal server error during registration' }, { status: 500 });
  }
}
