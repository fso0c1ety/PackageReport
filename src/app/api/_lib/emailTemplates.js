const escapeHtml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

export function buildPasswordResetEmail({ displayName, resetUrl }) {
  const safeName = escapeHtml(displayName || "there");
  const safeResetUrl = escapeHtml(resetUrl);

  return `
<div style="margin:0; padding:30px 20px; background-color:#f3f4f6; color:#111827; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px; margin:0 auto; overflow:hidden; border-radius:12px; background-color:#ffffff; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -2px rgba(0,0,0,0.05);">
    <div style="padding:32px 24px; background-color:#2563eb; text-align:center;">
      <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:700; letter-spacing:-0.025em;">Smart Manage</h1>
    </div>
    <div style="padding:40px 32px;">
      <h2 style="margin:0 0 18px; color:#1f2937; font-size:22px; font-weight:600;">Reset your password</h2>
      <p style="margin:0 0 14px; color:#4b5563; font-size:16px; line-height:1.6;">Hi ${safeName},</p>
      <p style="margin:0 0 28px; color:#4b5563; font-size:16px; line-height:1.6;">
        We received a request to reset your Smart Manage password. This secure link expires in 30 minutes and can be used once.
      </p>
      <div style="margin-bottom:30px; text-align:center;">
        <a href="${safeResetUrl}" style="display:inline-block; padding:13px 24px; border-radius:8px; background-color:#2563eb; color:#ffffff; font-size:16px; font-weight:700; text-decoration:none;">Reset password</a>
      </div>
      <p style="margin:0; color:#6b7280; font-size:14px; line-height:1.6;">
        If you did not request this password reset, you can safely ignore this email.
      </p>
      <div style="margin-top:36px; padding-top:24px; border-top:1px solid #e5e7eb; text-align:center;">
        <p style="margin:0; color:#6b7280; font-size:14px; line-height:1.5;">
          This is a security notification from <strong>Smart Manage</strong>.
        </p>
      </div>
    </div>
  </div>
</div>`;
}

export function buildAccountActionEmail({ displayName, actionUrl, activation = false }) {
  const safeName = escapeHtml(displayName || "there");
  const safeUrl = escapeHtml(actionUrl);
  const title = activation ? "Activate your account" : "Verify your email";
  const explanation = activation
    ? "A Smart Manage account already exists for this email. Confirm ownership before a password or profile can be assigned."
    : "Confirm this email address to finish securing your Smart Manage account.";
  return `<div style="font-family:Arial,sans-serif;background:#f3f4f6;padding:32px"><div style="max-width:600px;margin:auto;background:white;border-radius:12px;padding:32px"><h1 style="color:#4f46e5">Smart Manage</h1><h2>${title}</h2><p>Hi ${safeName},</p><p>${explanation}</p><p><a href="${safeUrl}" style="display:inline-block;background:#4f46e5;color:white;padding:13px 22px;border-radius:8px;text-decoration:none;font-weight:700">${title}</a></p><p style="color:#64748b">This single-use link expires in 24 hours. If you did not request it, ignore this email.</p></div></div>`;
}
