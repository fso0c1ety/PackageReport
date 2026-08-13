import packageJson from "../../../../package.json";
import updatePolicy from "../../../../server/services/appUpdatePolicy";

export const dynamic = "force-dynamic";

export async function GET() {
  const currentVersion = packageJson.version;
  const buildId = process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || currentVersion;
  const response = {
    schemaVersion: 1,
    application: "Smart Manage",
    currentVersion,
    generatedAt: new Date().toISOString(),
    windows: updatePolicy.buildPlatformPolicy("windows", currentVersion),
    android: updatePolicy.buildPlatformPolicy("android", currentVersion),
    ios: updatePolicy.buildPlatformPolicy("ios", currentVersion),
    web: {
      latestVersion: currentVersion,
      minimumVersion: currentVersion,
      updateType: "OPTIONAL",
      releaseNotes: updatePolicy.sanitizeReleaseNotes(process.env.SMART_MANAGE_WEB_RELEASE_NOTES || process.env.SMART_MANAGE_RELEASE_NOTES),
      buildId,
    },
  };

  return Response.json(response, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
