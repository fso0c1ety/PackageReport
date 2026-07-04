import crypto from "crypto";
import { pool } from "./server";

export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

export function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 8) return "Password must be at least 8 characters long";
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return "Password must include letters and numbers";
  }
  return null;
}

export const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export async function ensurePasswordResetTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      requested_ip TEXT
    )
  `);
}
