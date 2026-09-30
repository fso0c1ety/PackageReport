import { normalizedDatabaseIdentity } from "./verify-demo-database-target.mjs";

export function assertPortalCiEnvironment(env = process.env, connectionString = env.DATABASE_URL) {
  if (String(env.CI || "").toLowerCase() !== "true" || String(env.PORTAL_ACCEPTANCE_CI || "") !== "1") {
    throw new Error("Portal CI seed requires CI=true and PORTAL_ACCEPTANCE_CI=1");
  }
  if (env.VERCEL_ENV) throw new Error("Portal CI seed refuses Vercel environments");
  const identity = normalizedDatabaseIdentity(connectionString);
  if (!["localhost", "127.0.0.1"].includes(identity.host) || identity.database !== "smart_manage_portal_acceptance") {
    throw new Error("Portal CI seed requires localhost database smart_manage_portal_acceptance");
  }
  return identity;
}
