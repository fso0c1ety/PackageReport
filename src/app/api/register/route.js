import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { ensureExtendedUserProfileColumns, pool } from "../_lib/server";
import { sendEmail } from "../_lib/mailer";
import { buildAccountActionEmail } from "../_lib/emailTemplates";
import { publicAppUrl, replaceAccountToken } from "../_lib/accountTokens";
import { isValidEmail, validatePassword } from "../_lib/passwordReset";

export const runtime = "nodejs";
const genericResponse = {
  success: true,
  verificationRequired: true,
  message: "Check your email to verify or activate your account before signing in.",
};

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
    const hashedPassword = await bcrypt.hash(password, 12);

    if (existingUser) {
      if (existingUser.password) {
        return NextResponse.json(genericResponse);
      }

      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
      )}&background=random&color=fff&bold=true`;

      const rawToken = await replaceAccountToken({
        table: "account_activation_tokens",
        userId: existingUser.id,
        pendingProfile: { name, passwordHash: hashedPassword, avatar: avatarUrl, firstName, lastName, phone, jobTitle, company, birthDate, gender },
      });
      const actionUrl = `${publicAppUrl(req)}/activate-account/?token=${encodeURIComponent(rawToken)}`;
      try {
        await sendEmail({
          to: existingUser.email,
          subject: "Activate your Smart Manage account",
          text: `Confirm ownership and activate your account: ${actionUrl}. This link expires in 24 hours.`,
          html: buildAccountActionEmail({ displayName: existingUser.name || name, actionUrl, activation: true }),
        });
      } catch (emailError) {
        await pool.query("DELETE FROM account_activation_tokens WHERE user_id=$1", [existingUser.id]);
        console.error("[REGISTER] Activation email failed:", emailError);
      }
      return NextResponse.json(genericResponse);
    }

    const userId = uuidv4();
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=random&color=fff&bold=true`;

    await pool.query(
      `INSERT INTO users
       (id, name, email, avatar, password, first_name, last_name, phone, job_title, company, birth_date, gender, email_verified_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NULL)`,
      [userId, name, email, avatarUrl, hashedPassword, firstName, lastName, phone, jobTitle, company, birthDate, gender]
    );

    const rawToken = await replaceAccountToken({ table: "email_verification_tokens", userId });
    const actionUrl = `${publicAppUrl(req)}/verify-email/?token=${encodeURIComponent(rawToken)}`;
    try {
      await sendEmail({
        to: email, subject: "Verify your Smart Manage email",
        text: `Verify your Smart Manage email: ${actionUrl}. This link expires in 24 hours.`,
        html: buildAccountActionEmail({ displayName: name, actionUrl }),
      });
    } catch (emailError) {
      console.error("[REGISTER] Verification email failed:", emailError);
    }
    if (!isValidEmail(email)) return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    const passwordError = validatePassword(password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
    return NextResponse.json(genericResponse);
  } catch (err) {
    console.error("[REGISTER] Error:", err);
    return NextResponse.json(
      { error: "Internal server error during registration" },
      { status: 500 }
    );
  }
}
