import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "../_lib/server";
import { sendEmail } from "../_lib/mailer";
import { WORKSPACE_TEMPLATES } from "../../../workspaceTemplates";

export const runtime = "nodejs";
const attempts = new Map();
const TEAM_SIZES = new Set(["1-5", "6-20", "21-50", "51-200", "200+"]);
const INTERESTS = new Set(["Operations", "Tasks", "Customers", "Projects", "Logistics", "Employees", "Finance", "Documents", "Inventory", "Appointments", "Reporting", "Other"]);
const templateKeys = new Set(WORKSPACE_TEMPLATES.map((template) => template.key));
const clean = (value, max) => String(value || "").trim().slice(0, max);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export async function POST(req) {
  const now = Date.now(); const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const recent = (attempts.get(ip) || []).filter((time) => now - time < 60 * 60 * 1000);
  if (recent.length >= 4) return NextResponse.json({ error: "Too many requests. Please try later." }, { status: 429 });
  attempts.set(ip, [...recent, now]);
  const body = await req.json().catch(() => ({}));
  if (body.website) return NextResponse.json({ success: true });
  if (now - Number(body.startedAt || 0) < 1800) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  const name = clean(body.name, 120), companyName = clean(body.companyName, 160), email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 60), businessType = clean(body.businessType, 100), teamSize = clean(body.teamSize, 20), message = clean(body.message, 3000);
  const managementInterests = [...new Set((Array.isArray(body.managementInterests) ? body.managementInterests : []).map((item) => clean(item, 40)).filter((item) => INTERESTS.has(item)))];
  if (!name || !companyName || !templateKeys.has(businessType) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (teamSize && !TEAM_SIZES.has(teamSize))) return NextResponse.json({ error: "Please complete all required fields with valid information." }, { status: 400 });
  const recommendedTemplate = businessType;
  const id = randomUUID();
  await pool.query(`INSERT INTO demo_requests(id,name,company_name,email,phone,business_type,team_size,management_interests,message,recommended_template)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`, [id, name, companyName, email, phone || null, businessType, teamSize || null, JSON.stringify(managementInterests), message, recommendedTemplate]);
  const safe = { name: escapeHtml(name), company: escapeHtml(companyName), email: escapeHtml(email), type: escapeHtml(businessType), size: escapeHtml(teamSize || "Not specified"), message: escapeHtml(message || "—") };
  await Promise.allSettled([
    sendEmail({ to: process.env.DEMO_REQUESTS_EMAIL_TO || process.env.CONTACT_EMAIL_TO || "a.gjendzz@gmail.com", subject: `[Demo Request] ${companyName}`, text: `Company: ${companyName}\nContact: ${name}\nEmail: ${email}\nBusiness type: ${businessType}\nTeam size: ${teamSize || "Not specified"}\nInterests: ${managementInterests.join(", ") || "Not specified"}\n\n${message}`, html: `<h2>New Smart Manage demo request</h2><p><b>Company:</b> ${safe.company}</p><p><b>Contact:</b> ${safe.name}</p><p><b>Email:</b> ${safe.email}</p><p><b>Business type:</b> ${safe.type}</p><p><b>Team size:</b> ${safe.size}</p><p>${safe.message}</p>` }),
    sendEmail({ to: email, subject: "We received your Smart Manage demo request", text: `Hi ${name},\n\nThank you for requesting a Smart Manage demo. We will review your requirements and contact you shortly.\n\nSmart Manage` }),
  ]).then((results) => { if (results.some((result) => result.status === "rejected")) console.warn("demo_request_email_delivery_failed", { requestId: id }); });
  return NextResponse.json({ success: true, requestId: id }, { status: 201 });
}
