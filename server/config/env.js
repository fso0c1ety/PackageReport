const fs = require("fs");
const path = require("path");
const envSources = new Map();

function loadDotEnv() {
  const envPath = path.join(__dirname, "..", "..", ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
      envSources.set(key, ".env");
    } else {
      envSources.set(key, "process environment");
    }
  }
}

loadDotEnv();

function requiredEnv(name, options = {}) {
  const value = process.env[name];
  if (!value && options.required !== false) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || options.defaultValue || "";
}

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.SECRET_KEY || requiredEnv("JWT_SECRET");
}

function getDatabaseUrl() {
  return requiredEnv("DATABASE_URL");
}

function getEnvSource(name) {
  if (envSources.has(name)) return envSources.get(name);
  return process.env[name] ? "process environment" : "not set";
}

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const defaultDevOrigins = [
  "http://localhost:3000",
  "http://localhost:4000",
  "http://localhost",
  "http://192.168.0.28:3000",
  "capacitor://localhost",
];

function getAllowedOrigins() {
  const configured = parseCsv(process.env.CORS_ORIGINS);
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;
  return Array.from(new Set([
    ...configured,
    ...(frontendUrl ? [frontendUrl] : []),
    ...(process.env.NODE_ENV === "production" ? [] : defaultDevOrigins),
  ]));
}

module.exports = {
  getAllowedOrigins,
  getDatabaseUrl,
  getEnvSource,
  getJwtSecret,
  parseCsv,
  requiredEnv,
};
