import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../_lib/server";
import { sendEmail } from "../_lib/mailer";

export const runtime = "nodejs";

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { to, subject, text, html } = await req.json();
    const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);

    if (recipients.length === 0) {
      return NextResponse.json({ error: "Recipient is required" }, { status: 400 });
    }

    await sendEmail({
      to: recipients,
      subject: subject || "Smart Manage Update",
      text: text || "",
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[SEND EMAIL][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
