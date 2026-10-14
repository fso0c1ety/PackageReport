import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";

export const runtime = "nodejs";

function schemaNotReady(error) {
  return error?.code === "42P01" || error?.code === "42703";
}

function schemaNotReadyResponse(error) {
  return schemaNotReady(error)
    ? NextResponse.json({ error: "Calendar schema is not prepared", code: "CALENDAR_SCHEMA_NOT_READY" }, { status: 503 })
    : null;
}

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await pool.query("SELECT id,user_id,title,description,event_type,starts_at,ends_at,color,created_at,updated_at,reminder_sent_at,reminder_read_at FROM calendar_events WHERE user_id=$1 ORDER BY starts_at ASC", [user.id]);
    return NextResponse.json(result.rows);
  } catch (error) {
    const response = schemaNotReadyResponse(error);
    if (response) return response;
    console.error("[CALENDAR][GET]", error);
    return NextResponse.json({ error: "Unable to load calendar events" }, { status: 500 });
  }
}

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { title, description = "", eventType = "event", startsAt, endsAt = null, color = "#6366f1" } = await req.json();
    if (!title?.trim() || !startsAt) return NextResponse.json({ error: "Title and start time are required" }, { status: 400 });
    const result = await pool.query(`INSERT INTO calendar_events(user_id,title,description,event_type,starts_at,ends_at,color) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,user_id,title,description,event_type,starts_at,ends_at,color,created_at,updated_at,reminder_sent_at,reminder_read_at`, [user.id, title.trim(), description, eventType, startsAt, endsAt || null, color]);
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    const response = schemaNotReadyResponse(error);
    if (response) return response;
    console.error("[CALENDAR][POST]", error);
    return NextResponse.json({ error: "Unable to create event" }, { status: 500 });
  }
}

export async function PUT(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id, title, description = "", eventType = "event", startsAt, endsAt = null, color = "#6366f1" } = await req.json();
    if (!id || !title?.trim() || !startsAt) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    const result = await pool.query(`UPDATE calendar_events SET title=$1,description=$2,event_type=$3,starts_at=$4,ends_at=$5,color=$6,updated_at=NOW() WHERE id=$7 AND user_id=$8 RETURNING id,user_id,title,description,event_type,starts_at,ends_at,color,created_at,updated_at,reminder_sent_at,reminder_read_at`, [title.trim(), description, eventType, startsAt, endsAt || null, color, id, user.id]);
    if (!result.rows[0]) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    const response = schemaNotReadyResponse(error);
    if (response) return response;
    console.error("[CALENDAR][PUT]", error);
    return NextResponse.json({ error: "Unable to update event" }, { status: 500 });
  }
}

export async function DELETE(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Event id is required" }, { status: 400 });
    await pool.query("DELETE FROM calendar_events WHERE id=$1 AND user_id=$2", [id, user.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    const response = schemaNotReadyResponse(error);
    if (response) return response;
    console.error("[CALENDAR][DELETE]", error);
    return NextResponse.json({ error: "Unable to delete event" }, { status: 500 });
  }
}

export async function PATCH(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await pool.query("UPDATE calendar_events SET reminder_read_at=NOW() WHERE user_id=$1 AND reminder_sent_at IS NOT NULL AND reminder_read_at IS NULL", [user.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    const response = schemaNotReadyResponse(error);
    if (response) return response;
    console.error("[CALENDAR][PATCH]", error);
    return NextResponse.json({ error: "Unable to mark reminders read" }, { status: 500 });
  }
}
