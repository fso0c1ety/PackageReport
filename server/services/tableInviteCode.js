const crypto = require("node:crypto");

const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function normalizeInviteCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "");
}

function isValidInviteCode(value) {
  return /^[A-Z0-9]{8}$/.test(normalizeInviteCode(value));
}

function generateInviteCode(randomBytes = crypto.randomBytes) {
  const bytes = randomBytes(8);
  let code = "";
  for (let index = 0; index < 8; index += 1) {
    code += INVITE_CODE_ALPHABET[bytes[index] % INVITE_CODE_ALPHABET.length];
  }
  return code;
}

module.exports = { generateInviteCode, isValidInviteCode, normalizeInviteCode };
