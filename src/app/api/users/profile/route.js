import { NextResponse } from "next/server";
import {
  ensureUserNotificationColumns,
  ensureExtendedUserProfileColumns,
  getAuthenticatedUser,
  pool,
} from "../../_lib/server";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureUserNotificationColumns();
    await ensureExtendedUserProfileColumns();

    const result = await pool.query(
      `
        SELECT
          id,
          name,
          email,
          avatar,
          phone,
          job_title,
          company,
          first_name,
          last_name,
          birth_date,
          gender,
          COALESCE(email_notifications, TRUE) AS email_notifications,
          COALESCE(push_notifications, TRUE) AS push_notifications
        FROM users
        WHERE id = $1
      `,
      [user.id]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("[PROFILE][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureUserNotificationColumns();
    await ensureExtendedUserProfileColumns();

    const {
      name = null,
      avatar = null,
      phone = null,
      job_title = null,
      company = null,
      first_name = null,
      last_name = null,
      birth_date = null,
      gender = null,
      email_notifications = null,
      push_notifications = null,
    } = await req.json();

    const result = await pool.query(
      `
        UPDATE users
        SET
          name = COALESCE($1, name),
          avatar = COALESCE($2, avatar),
          phone = COALESCE($3, phone),
          job_title = COALESCE($4, job_title),
          company = COALESCE($5, company),
          first_name = COALESCE($6, first_name),
          last_name = COALESCE($7, last_name),
          birth_date = COALESCE($8, birth_date),
          gender = COALESCE($9, gender),
          email_notifications = COALESCE($10, email_notifications, TRUE),
          push_notifications = COALESCE($11, push_notifications, TRUE)
        WHERE id = $12
        RETURNING
          id,
          name,
          email,
          avatar,
          phone,
          job_title,
          company,
          first_name,
          last_name,
          birth_date,
          gender,
          COALESCE(email_notifications, TRUE) AS email_notifications,
          COALESCE(push_notifications, TRUE) AS push_notifications
      `,
      [
        name,
        avatar,
        phone,
        job_title,
        company,
        first_name,
        last_name,
        birth_date,
        gender,
        email_notifications,
        push_notifications,
        user.id,
      ]
    );

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "User not found or not updated" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("[PROFILE][PUT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
