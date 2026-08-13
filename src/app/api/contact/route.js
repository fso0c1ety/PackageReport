import { NextResponse } from "next/server";
import { sendEmail } from "../_lib/mailer";
import brand from "../../../../config/brand.json";

export const runtime = "nodejs";
const attempts = new Map();

export async function POST(req) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now(); const recent = (attempts.get(ip) || []).filter((time) => now - time < 60 * 60 * 1000);
  if (recent.length >= 5) return NextResponse.json({ error: "Too many messages. Please try later." }, { status: 429 });
  attempts.set(ip, [...recent, now]);
  const body = await req.json().catch(() => ({}));
  if (body.website) return NextResponse.json({ success: true });
  if (now - Number(body.startedAt || 0) < 1500) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  const name = String(body.name || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().slice(0, 200);
  const company = String(body.company || "").trim().slice(0, 160);
  const subject = String(body.subject || "Smart Manage website enquiry").trim().slice(0, 160);
  const message = String(body.message || "").trim().slice(0, 5000);
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Valid name, email and message are required" }, { status: 400 });
  await sendEmail({ to: brand.supportEmail, subject: `[Website] ${subject}`, text: `Name: ${name}\nEmail: ${email}\nCompany: ${company || "—"}\n\n${message}` });
  return NextResponse.json({ success: true });
}
