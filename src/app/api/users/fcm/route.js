import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import db from "@/lib/db";

export const runtime = "nodejs";

export async function PUT(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const token = body?.token;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    await db.query("UPDATE public.users SET fcm_token = $1 WHERE id = $2", [
      token,
      user.id,
    ]);

    let storedInArray = false;
    try {
      await db.query(
        `
          UPDATE public.users
          SET fcm_tokens = CASE
              WHEN fcm_tokens IS NULL THEN jsonb_build_array($1::text)
              WHEN jsonb_typeof(fcm_tokens) <> 'array' THEN jsonb_build_array($1::text)
              WHEN NOT (fcm_tokens @> jsonb_build_array($1::text)) THEN fcm_tokens || jsonb_build_array($1::text)
              ELSE fcm_tokens
          END
          WHERE id = $2
        `,
        [token, user.id]
      );
      storedInArray = true;
    } catch (pluralErr) {
      console.warn("[FCM] Non-fatal error updating fcm_tokens:", pluralErr);
    }

    return NextResponse.json({ success: true, storedInArray });
  } catch (err) {
    console.error("[FCM] Error updating token:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await db.query("UPDATE public.users SET fcm_token = NULL WHERE id = $1", [user.id]);
    try {
      await db.query("UPDATE public.users SET fcm_tokens = '[]'::jsonb WHERE id = $1", [
        user.id,
      ]);
    } catch (pluralErr) {
      console.warn("[FCM] Non-fatal error clearing fcm_tokens:", pluralErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[FCM] Error clearing token:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
