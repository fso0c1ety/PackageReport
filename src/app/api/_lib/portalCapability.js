import { createHmac, timingSafeEqual } from "node:crypto";
import { SECRET_KEY } from "./server";

const bucket = () => Math.floor(Date.now() / 3_600_000);
export const portalRecordCapability = (userId, workspaceId, portalType, entity, recordId, period = bucket()) =>
  createHmac("sha256", SECRET_KEY).update([userId, workspaceId, portalType, entity, recordId, period].join(":"), "utf8").digest("base64url");
export const validPortalCapability = (token, userId, workspaceId, portalType, entity, recordId) => [bucket(), bucket() - 1].some((period) => {
  const expected = portalRecordCapability(userId, workspaceId, portalType, entity, recordId, period);
  const actual = String(token || "");
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
});
