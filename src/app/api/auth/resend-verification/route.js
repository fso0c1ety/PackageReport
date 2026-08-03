import { NextResponse } from "next/server";
import { pool } from "../../_lib/server";
import { sendEmail } from "../../_lib/mailer";
import { buildAccountActionEmail } from "../../_lib/emailTemplates";
import { publicAppUrl, replaceAccountToken } from "../../_lib/accountTokens";

export const runtime = "nodejs";
const generic = { success: true, message: "If verification is needed, a new link has been sent." };

export async function POST(req) {
  const { email: rawEmail } = await req.json().catch(() => ({}));
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  try {
    const result = await pool.query("SELECT id,name,email,email_verified_at FROM users WHERE LOWER(email)=$1", [email]);
    const user = result.rows[0];
    if (!user || user.email_verified_at) return NextResponse.json(generic);
    const token = await replaceAccountToken({ table: "email_verification_tokens", userId: user.id });
    const actionUrl = `${publicAppUrl(req)}/verify-email/?token=${encodeURIComponent(token)}`;
    await sendEmail({
      to: user.email, subject: "Verify your Smart Manage email",
      text: `Verify your Smart Manage email: ${actionUrl}. This link expires in 24 hours.`,
      html: buildAccountActionEmail({ displayName: user.name, actionUrl }),
    });
  } catch (error) {
    console.error("[RESEND VERIFICATION] Error:", error);
  }
  return NextResponse.json(generic);
}
