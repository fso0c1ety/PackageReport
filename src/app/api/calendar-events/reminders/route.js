import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthenticatedUser, pool } from "../../_lib/server";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await pool.query(`ALTER TABLE calendar_events
      ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS reminder_read_at TIMESTAMPTZ`);
    const due = await pool.query(`
      UPDATE calendar_events
      SET reminder_sent_at=NOW()
      WHERE user_id=$1 AND reminder_sent_at IS NULL
        AND starts_at <= NOW() AND starts_at >= NOW() - INTERVAL '24 hours'
      RETURNING id,title,event_type,starts_at
    `, [user.id]);
    for (const event of due.rows) {
      await pool.query(`INSERT INTO notifications(id,recipient_id,sender_id,type,data,read,created_at)
        VALUES($1,$2,NULL,'calendar_reminder',$3::jsonb,FALSE,NOW())`, [randomUUID(), user.id, JSON.stringify({ title: `Reminder: ${event.title}`, message: `${event.event_type} is starting now`, eventId: event.id, href: "/calendar" })]);
    }
    const count = await pool.query("SELECT COUNT(*)::int AS count FROM calendar_events WHERE user_id=$1 AND reminder_sent_at IS NOT NULL AND reminder_read_at IS NULL", [user.id]);
    return NextResponse.json({ count: count.rows[0]?.count || 0, triggered: due.rows });
  } catch (error) {
    console.error("[CALENDAR][REMINDERS]", error);
    return NextResponse.json({ error: "Unable to check reminders" }, { status: 500 });
  }
}
