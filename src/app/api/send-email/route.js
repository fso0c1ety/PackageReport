import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mailer';

export const runtime = 'nodejs';

export async function POST(req) {
  const { to, subject, text, html } = await req.json();
  if (!to) return NextResponse.json({ error: 'Missing recipient' }, { status: 400 });
  try {
    const info = await sendEmail({ to, subject, text, html });
    return NextResponse.json({ success: true, info });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
