import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export async function hashPublicSharePassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(String(password), salt, 64);
  return `${salt}:${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPublicSharePassword(password, stored) {
  const [salt, expectedHex] = String(stored || "").split(":");
  if (!salt || !expectedHex) return false;
  const actual = Buffer.from(await scrypt(String(password), salt, 64));
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function publicShareCookieName(token) {
  return `sm_share_${createHmac("sha256", process.env.JWT_SECRET || "smart-manage")
    .update(String(token)).digest("hex").slice(0, 20)}`;
}

export function publicShareUnlockValue(token) {
  return createHmac("sha256", process.env.JWT_SECRET || "smart-manage")
    .update(`public-share:${token}`).digest("hex");
}

export function hasPublicShareUnlock(req, token) {
  const actual = req.cookies.get(publicShareCookieName(token))?.value || "";
  const expected = publicShareUnlockValue(token);
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function ensurePublicShareSecuritySchema(pool) {
  await pool.query(`ALTER TABLE tables
    ADD COLUMN IF NOT EXISTS public_share_password_hash TEXT,
    ADD COLUMN IF NOT EXISTS public_share_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS public_share_downloads BOOLEAN NOT NULL DEFAULT FALSE`);
}
