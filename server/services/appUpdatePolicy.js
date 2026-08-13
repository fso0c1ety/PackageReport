const OFFICIAL_WINDOWS_DOWNLOAD = "https://github.com/fso0c1ety/PackageReport/releases/latest/download/Smart.Manage.zip";
const UPDATE_TYPES = new Set(["OPTIONAL", "RECOMMENDED", "REQUIRED"]);

function parseSemver(value) {
  const match = String(value || "").trim().match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), prerelease: match[4] || "" };
}

function compareSemver(left, right) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) return null;
  for (const key of ["major", "minor", "patch"]) {
    if (a[key] !== b[key]) return a[key] > b[key] ? 1 : -1;
  }
  if (a.prerelease === b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return a.prerelease.localeCompare(b.prerelease, "en", { numeric: true });
}

function normalizeUpdateType(value) {
  const normalized = String(value || "OPTIONAL").toUpperCase();
  return UPDATE_TYPES.has(normalized) ? normalized : "OPTIONAL";
}

function sanitizeReleaseNotes(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(/\r?\n/);
  return source
    .map((entry) => String(entry || "").replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f\u007f]/g, " ").trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((entry) => entry.slice(0, 240));
}

function officialStoreUrl(platform, value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (platform === "android" && url.hostname !== "play.google.com") return null;
    if (platform === "ios" && !["apps.apple.com", "itunes.apple.com"].includes(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function evaluateUpdate(installedVersion, policy) {
  const latestComparison = compareSemver(policy?.latestVersion, installedVersion);
  const minimumComparison = compareSemver(policy?.minimumVersion, installedVersion);
  if (latestComparison === null || minimumComparison === null) return { available: false, required: false, invalid: true };
  const required = minimumComparison > 0;
  return {
    available: latestComparison > 0,
    required,
    invalid: false,
    updateType: required ? "REQUIRED" : normalizeUpdateType(policy?.updateType),
  };
}

function shouldShowUpdate({ targetVersion, updateType, dismissedVersion, dismissedAt, now = Date.now(), reminderMs = 24 * 60 * 60 * 1000 }) {
  if (!parseSemver(targetVersion)) return false;
  if (normalizeUpdateType(updateType) === "REQUIRED") return true;
  if (dismissedVersion !== targetVersion) return true;
  return !Number.isFinite(Number(dismissedAt)) || now - Number(dismissedAt) >= reminderMs;
}

function buildPlatformPolicy(platform, currentVersion, env = process.env) {
  const prefix = platform.toUpperCase();
  const latestVersion = parseSemver(env[`SMART_MANAGE_${prefix}_LATEST_VERSION`]) ? env[`SMART_MANAGE_${prefix}_LATEST_VERSION`] : currentVersion;
  const minimumVersion = parseSemver(env[`SMART_MANAGE_${prefix}_MINIMUM_VERSION`]) ? env[`SMART_MANAGE_${prefix}_MINIMUM_VERSION`] : currentVersion;
  const updateType = normalizeUpdateType(env[`SMART_MANAGE_${prefix}_UPDATE_TYPE`]);
  const releaseNotes = sanitizeReleaseNotes(env[`SMART_MANAGE_${prefix}_RELEASE_NOTES`] || env.SMART_MANAGE_RELEASE_NOTES || "Security, reliability and performance improvements.");
  const storeUrl = platform === "windows"
    ? OFFICIAL_WINDOWS_DOWNLOAD
    : officialStoreUrl(platform, env[`SMART_MANAGE_${prefix}_STORE_URL`]);
  // A mobile app must never be trapped behind a required update when there is
  // no verified official store destination configured.
  if ((platform === "android" || platform === "ios") && !storeUrl) {
    return { latestVersion: currentVersion, minimumVersion: currentVersion, updateType: "OPTIONAL", releaseNotes, storeUrl: null };
  }
  return { latestVersion, minimumVersion, updateType, releaseNotes, storeUrl };
}

module.exports = {
  OFFICIAL_WINDOWS_DOWNLOAD,
  UPDATE_TYPES,
  buildPlatformPolicy,
  compareSemver,
  evaluateUpdate,
  normalizeUpdateType,
  officialStoreUrl,
  parseSemver,
  sanitizeReleaseNotes,
  shouldShowUpdate,
};
