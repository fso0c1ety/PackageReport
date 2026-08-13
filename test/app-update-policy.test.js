const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  OFFICIAL_WINDOWS_DOWNLOAD,
  buildPlatformPolicy,
  compareSemver,
  evaluateUpdate,
  officialStoreUrl,
  sanitizeReleaseNotes,
  shouldShowUpdate,
} = require("../server/services/appUpdatePolicy");

test("semantic versions compare safely and malformed versions are rejected", () => {
  assert.equal(compareSemver("1.0.1", "1.0.0"), 1);
  assert.equal(compareSemver("1.0.0-beta.2", "1.0.0-beta.1"), 1);
  assert.equal(compareSemver("1.0.0", "1.0.0-beta.2"), 1);
  assert.equal(compareSemver("not-a-version", "1.0.0"), null);
});

test("optional, recommended and explicit minimum required policies are evaluated", () => {
  const base = { latestVersion: "1.1.0", minimumVersion: "1.0.0", releaseNotes: [], storeUrl: null };
  assert.deepEqual(evaluateUpdate("1.0.0", { ...base, updateType: "OPTIONAL" }), { available: true, required: false, invalid: false, updateType: "OPTIONAL" });
  assert.equal(evaluateUpdate("1.0.0", { ...base, updateType: "RECOMMENDED" }).updateType, "RECOMMENDED");
  assert.equal(evaluateUpdate("0.9.0", { ...base, updateType: "OPTIONAL" }).required, true);
  assert.equal(evaluateUpdate("1.0.0", { ...base, latestVersion: "bad", updateType: "REQUIRED" }).invalid, true);
});

test("dismissal lasts one day for the same version, newer versions show, required cannot be dismissed", () => {
  const now = 2_000_000_000;
  assert.equal(shouldShowUpdate({ targetVersion: "1.1.0", updateType: "OPTIONAL", dismissedVersion: "1.1.0", dismissedAt: now - 1000, now }), false);
  assert.equal(shouldShowUpdate({ targetVersion: "1.1.1", updateType: "OPTIONAL", dismissedVersion: "1.1.0", dismissedAt: now - 1000, now }), true);
  assert.equal(shouldShowUpdate({ targetVersion: "1.1.0", updateType: "RECOMMENDED", dismissedVersion: "1.1.0", dismissedAt: now - 86_400_001, now }), true);
  assert.equal(shouldShowUpdate({ targetVersion: "1.1.0", updateType: "REQUIRED", dismissedVersion: "1.1.0", dismissedAt: now, now }), true);
});

test("release notes are plain text and official store hosts are enforced", () => {
  assert.deepEqual(sanitizeReleaseNotes(["<script>alert(1)</script>Safe", "  Fixed\u0000 bug  "]), ["alert(1)Safe", "Fixed  bug"]);
  assert.match(officialStoreUrl("android", "https://play.google.com/store/apps/details?id=com.smartmanage.app"), /^https:\/\/play\.google\.com/);
  assert.equal(officialStoreUrl("android", "https://evil.example/app.apk"), null);
  assert.match(officialStoreUrl("ios", "https://apps.apple.com/app/id123"), /^https:\/\/apps\.apple\.com/);
});

test("mobile required policy fails open when no verified store listing exists", () => {
  const policy = buildPlatformPolicy("android", "1.0.0", {
    SMART_MANAGE_ANDROID_LATEST_VERSION: "2.0.0",
    SMART_MANAGE_ANDROID_MINIMUM_VERSION: "2.0.0",
    SMART_MANAGE_ANDROID_UPDATE_TYPE: "REQUIRED",
  });
  assert.equal(policy.latestVersion, "1.0.0");
  assert.equal(policy.minimumVersion, "1.0.0");
  assert.equal(policy.storeUrl, null);
});

test("release and landing contracts preserve official stable Windows download", () => {
  const root = path.join(__dirname, "..");
  const landing = fs.readFileSync(path.join(root, "src/app/page.tsx"), "utf8");
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/release-windows.yml"), "utf8");
  assert.equal(OFFICIAL_WINDOWS_DOWNLOAD, "https://github.com/fso0c1ety/PackageReport/releases/latest/download/Smart.Manage.zip");
  assert.ok(landing.includes(OFFICIAL_WINDOWS_DOWNLOAD));
  assert.ok(workflow.includes("Smart.Manage.zip"));
  assert.ok(workflow.includes("prereleases. Stable releases are tag-triggered only"));
});

test("Android derives versionName from the canonical package version and keeps a monotonic code", () => {
  const root = path.join(__dirname, "..");
  const gradle = fs.readFileSync(path.join(root, "android/app/build.gradle"), "utf8");
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.match(packageJson.version, /^\d+\.\d+\.\d+$/);
  assert.ok(Number.isInteger(packageJson.smartManage.androidVersionCode));
  assert.ok(gradle.includes("versionName canonicalVersionName"));
  assert.ok(gradle.includes("versionCode canonicalVersionCode"));
});

test("client update UI supports refresh, Windows lifecycle and non-blocking failures", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/app/SmartManageUpdate.tsx"), "utf8");
  for (const contract of ["window.location.reload()", 'state === "downloading"', 'state === "ready"', 'state === "error"', "Restart & Update", "Offline/update-service failures never block"]) {
    assert.ok(source.includes(contract), `missing update UI contract: ${contract}`);
  }
});

test("native PR workflows package and smoke-test Windows and verify Android metadata", () => {
  const root = path.join(__dirname, "..");
  const windows = fs.readFileSync(path.join(root, ".github/workflows/desktop-exe.yml"), "utf8");
  const android = fs.readFileSync(path.join(root, ".github/workflows/android-build.yml"), "utf8");
  for (const contract of ["pull_request:", "Smart Manage.exe", "app-update.yml", "Start-Process", "ProductVersion", "fso0c1ety", "PackageReport"]) {
    assert.ok(windows.includes(contract), `missing Windows CI contract: ${contract}`);
  }
  for (const contract of ["npx cap sync android", "assembleDebug", "com.smartmanage.app", "versionName", "versionCode", "REQUEST_INSTALL_PACKAGES"]) {
    assert.ok(android.includes(contract), `missing Android CI contract: ${contract}`);
  }
});
