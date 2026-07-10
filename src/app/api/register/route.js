import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { ensureExtendedUserProfileColumns, pool } from "../_lib/server";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    await ensureExtendedUserProfileColumns();
    const body = await req.json();
    const firstName = String(body?.first_name || "").trim();
    const lastName = String(body?.last_name || "").trim();
    const name = String(body?.name || `${firstName} ${lastName}`).trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const phone = String(body?.phone || "").trim();
    const jobTitle = String(body?.job_title || "").trim();
    const company = String(body?.company || "").trim();
    const birthDate = body?.birth_date || null;
    const gender = String(body?.gender || "").trim() || null;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const existingUser = result.rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
      if (existingUser.password) {
        return NextResponse.json({ error: "User already exists" }, { status: 400 });
      }

      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
      )}&background=random&color=fff&bold=true`;

      await pool.query(
        `UPDATE users SET name=$1, password=$2, avatar=$3, first_name=$4, last_name=$5,
         phone=$6, job_title=$7, company=$8, birth_date=$9, gender=$10 WHERE id=$11`,
        [name, hashedPassword, avatarUrl, firstName, lastName, phone, jobTitle, company, birthDate, gender, existingUser.id]
      );

      return NextResponse.json({
        success: true,
        message: "Account updated with password and avatar successfully",
      });
    }

    const userId = uuidv4();
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=random&color=fff&bold=true`;

    await pool.query(
      `INSERT INTO users
       (id, name, email, avatar, password, first_name, last_name, phone, job_title, company, birth_date, gender)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [userId, name, email, avatarUrl, hashedPassword, firstName, lastName, phone, jobTitle, company, birthDate, gender]
    );

    return NextResponse.json({
      success: true,
      message: "User registered successfully",
    });
  } catch (err) {
    console.error("[REGISTER] Error:", err);
    return NextResponse.json(
      { error: "Internal server error during registration" },
      { status: 500 }
    );
  }
}
