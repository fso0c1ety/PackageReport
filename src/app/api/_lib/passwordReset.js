import crypto from "crypto";

export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

export function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 10) return "Password must be at least 10 characters long";
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
    return "Password must include uppercase, lowercase and number characters";
  }
  return null;
}

export const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export async function ensurePasswordResetTable() {
  // Compatibility export for existing callers. Schema provisioning belongs to
  // migration 004_password_reset_tokens.sql, never to an unauthenticated request.
  // A missing schema fails at the caller's normal SQL operation; do not repair it.
}
