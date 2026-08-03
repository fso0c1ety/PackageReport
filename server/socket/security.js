const MAX_SOCKET_PAYLOAD_BYTES = Math.max(1024, Number(process.env.MAX_SOCKET_PAYLOAD_BYTES || 64 * 1024));
const SOCKET_EVENT_LIMIT = Math.max(10, Number(process.env.SOCKET_EVENT_LIMIT_PER_MINUTE || 120));

function isSafeSocketPayload(payload) {
  if (payload == null) return true;
  if (typeof payload !== "object" || Array.isArray(payload)) return false;
  try { return Buffer.byteLength(JSON.stringify(payload), "utf8") <= MAX_SOCKET_PAYLOAD_BYTES; }
  catch { return false; }
}

function isSafeIdentifier(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 200 && /^[a-zA-Z0-9:_-]+$/.test(value);
}

function createSocketEventGuard() {
  const windows = new Map();
  return function allow(socketId, eventName, payload) {
    if (!isSafeSocketPayload(payload)) return false;
    const key = `${socketId}:${eventName}`;
    const now = Date.now();
    const current = windows.get(key);
    if (!current || now - current.startedAt >= 60000) {
      windows.set(key, { startedAt: now, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= SOCKET_EVENT_LIMIT;
  };
}

async function usersMayCommunicate(db, userId, targetId) {
  if (!userId || !targetId || String(userId) === String(targetId)) return false;
  const result = await db.query(`SELECT 1 WHERE
    EXISTS (SELECT 1 FROM friends WHERE status='accepted' AND
      ((user_id::text=$1::text AND friend_id::text=$2::text) OR (user_id::text=$2::text AND friend_id::text=$1::text)))
    OR EXISTS (SELECT 1 FROM direct_messages WHERE
      (sender_id::text=$1::text AND recipient_id::text=$2::text) OR (sender_id::text=$2::text AND recipient_id::text=$1::text))
    OR EXISTS (
      SELECT 1 FROM workspaces w
      WHERE (w.owner_id::text=$1::text OR EXISTS (SELECT 1 FROM workspace_members a WHERE a.workspace_id=w.id AND a.user_id::text=$1::text))
        AND (w.owner_id::text=$2::text OR EXISTS (SELECT 1 FROM workspace_members b WHERE b.workspace_id=w.id AND b.user_id::text=$2::text))
    ) LIMIT 1`, [String(userId), String(targetId)]);
  return result.rowCount > 0;
}

module.exports = { createSocketEventGuard, isSafeIdentifier, isSafeSocketPayload, usersMayCommunicate };
