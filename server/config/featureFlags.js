const defaults = require("../../config/feature-flags.json");

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

function parseBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return fallback;
}

function envName(flag) {
  return `FEATURE_${flag.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase()}`;
}

function getFeatureFlags(env = process.env) {
  return Object.fromEntries(
    Object.entries(defaults).map(([flag, enabled]) => [
      flag,
      parseBoolean(env[envName(flag)], enabled),
    ]),
  );
}

function isFeatureEnabled(flag, env = process.env) {
  if (!Object.prototype.hasOwnProperty.call(defaults, flag)) return false;
  return getFeatureFlags(env)[flag];
}

module.exports = { getFeatureFlags, isFeatureEnabled, parseBoolean, envName };
