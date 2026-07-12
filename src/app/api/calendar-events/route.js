import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";

export const runtime = "nodejs";

async function ensureCalendarTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    event_type TEXT NOT NULL DEFAULT 'event',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    color TEXT NOT NULL DEFAULT '#6366f1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query("CREATE INDEX IF NOT EXISTS calendar_events_user_start_idx ON calendar_events(user_id, starts_at)");
}

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureCalendarTable();
    const result = await pool.query("SELECT * FROM calendar_events WHERE user_id=$1 ORDER BY starts_at ASC", [user.id]);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[CALENDAR][GET]", error);
    return NextResponse.json({ error: "Unable to load calendar events" }, { status: 500 });
  }
}

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureCalendarTable();
    const { title, description = "", eventType = "event", startsAt, endsAt = null, color = "#6366f1" } = await req.json();
    if (!title?.trim() || !startsAt) return NextResponse.json({ error: "Title and start time are required" }, { status: 400 });
    const result = await pool.query(`INSERT INTO calendar_events(user_id,title,description,event_type,starts_at,ends_at,color) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [user.id, title.trim(), description, eventType, startsAt, endsAt || null, color]);
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("[CALENDAR][POST]", error);
    return NextResponse.json({ error: "Unable to create event" }, { status: 500 });
  }
}

export async function PUT(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureCalendarTable();
    const { id, title, description = "", eventType = "event", startsAt, endsAt = null, color = "#6366f1" } = await req.json();
    if (!id || !title?.trim() || !startsAt) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    const result = await pool.query(`UPDATE calendar_events SET title=$1,description=$2,event_type=$3,starts_at=$4,ends_at=$5,color=$6,updated_at=NOW() WHERE id=$7 AND user_id=$8 RETURNING *`, [title.trim(), description, eventType, startsAt, endsAt || null, color, id, user.id]);
    if (!result.rows[0]) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("[CALENDAR][PUT]", error);
    return NextResponse.json({ error: "Unable to update event" }, { status: 500 });
  }
}

export async function DELETE(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureCalendarTable();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Event id is required" }, { status: 400 });
    await pool.query("DELETE FROM calendar_events WHERE id=$1 AND user_id=$2", [id, user.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CALENDAR][DELETE]", error);
    return NextResponse.json({ error: "Unable to delete event" }, { status: 500 });
  }
}
