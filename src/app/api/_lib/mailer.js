const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "valonhalili74@gmail.com";
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || "Smart Manage App";

export async function sendEmail({ to, subject, text, html }) {
  const recipients = (Array.isArray(to) ? to : [to])
    .map((email) => String(email || "").trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    console.warn("[MAILER][NEXT] No recipients provided for email automation.");
    return { skipped: true, reason: "no-recipients" };
  }

  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured for Next API email sends");
  }

  const payload = {
    sender: {
      name: BREVO_SENDER_NAME,
      email: BREVO_SENDER_EMAIL,
    },
    to: recipients.map((email) => ({ email })),
    subject: subject || "Smart Manage notification",
    ...(html ? { htmlContent: html } : {}),
    ...(text ? { textContent: text } : {}),
  };

  if (!payload.htmlContent && !payload.textContent) {
    payload.textContent = "Message from Smart Manage";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brevo API Error ${response.status}: ${errorText}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
