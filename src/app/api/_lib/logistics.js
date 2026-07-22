import { randomUUID } from "node:crypto";
import { pool } from "./server";

export const LOGISTICS_TEMPLATE_KEYS = ["freight_broker", "fleet_management"];
export const DRIVER_STATUSES = ["Assigned", "Accepted", "Going to Pickup", "At Pickup", "Loaded", "In Transit", "At Delivery", "Delivered", "Problem Reported"];

let schemaPromise;
export function ensureLogisticsSchema() {
  if (!schemaPromise) schemaPromise = pool.query(`
    ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS template_key TEXT;
    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'viewer',
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(workspace_id,user_id)
    );
    ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    CREATE TABLE IF NOT EXISTS trip_status_history (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, trip_id TEXT NOT NULL,
      user_id TEXT NOT NULL, previous_status TEXT, new_status TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    UPDATE workspaces w SET template_key='fleet_management'
      WHERE template_key IS NULL
        AND EXISTS(SELECT 1 FROM tables t WHERE t.workspace_id=w.id AND LOWER(t.name)='drivers')
        AND EXISTS(SELECT 1 FROM tables t WHERE t.workspace_id=w.id AND LOWER(t.name)='trucks')
        AND EXISTS(SELECT 1 FROM tables t WHERE t.workspace_id=w.id AND LOWER(t.name)='trips');
    UPDATE workspaces w SET template_key='freight_broker'
      WHERE template_key IS NULL
        AND EXISTS(SELECT 1 FROM tables t WHERE t.workspace_id=w.id AND LOWER(t.name)='carriers')
        AND EXISTS(SELECT 1 FROM tables t WHERE t.workspace_id=w.id AND LOWER(t.name)='loads');
  `).catch((error) => { schemaPromise = undefined; throw error; });
  return schemaPromise;
}

export async function logisticsAccess(workspaceId, userId) {
  await ensureLogisticsSchema();
  const result = await pool.query(`
    SELECT w.id,w.name,w.owner_id,w.template_key,
      CASE WHEN w.owner_id=$2 THEN 'logistics_admin' ELSE wm.role END AS role,
      COALESCE(wm.settings,'{}'::jsonb) AS settings
    FROM workspaces w LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id=$2
    WHERE w.id=$1 AND (w.owner_id=$2 OR wm.user_id IS NOT NULL)
  `, [workspaceId, String(userId)]);
  const access = result.rows[0];
  if (!access || !LOGISTICS_TEMPLATE_KEYS.includes(access.template_key)) return null;
  return access;
}

export async function syncTripAssignment({ table, values, previousValues, actorId, rowId }) {
  if (!table || !["trips", "loads"].includes(String(table.name).toLowerCase())) return values;
  await ensureLogisticsSchema();
  const workspace = (await pool.query("SELECT template_key,owner_id FROM workspaces WHERE id=$1", [table.workspace_id])).rows[0];
  if (!workspace || !LOGISTICS_TEMPLATE_KEYS.includes(workspace.template_key)) return values;
  const driverColumn = (table.columns || []).find((column) => ["driver", "people", "people/driver"].includes(String(column.name).trim().toLowerCase()));
  if (!driverColumn) return values;
  const relation = Array.isArray(values[driverColumn.id]) ? values[driverColumn.id][0] : values[driverColumn.id];
  const previousUserId = previousValues?._assignedDriverUserId || null;
  const pickupColumn = (table.columns || []).find((column) => ["pickup", "pickup address"].includes(String(column.name).trim().toLowerCase()));
  const deliveryColumn = (table.columns || []).find((column) => ["delivery", "delivery address"].includes(String(column.name).trim().toLowerCase()));
  const tripNumberColumn = (table.columns || []).find((column) => ["trip number", "load id"].includes(String(column.name).trim().toLowerCase()));
  const locationAddress = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    const location = Array.isArray(value) ? value[0] : value;
    return String(location?.address || location?.formattedAddress || location?.formatted_address || location?.label || location?.name || location?.value || "");
  };
  const pickupAddress = pickupColumn ? locationAddress(values[pickupColumn.id]) : "";
  const deliveryAddress = deliveryColumn ? locationAddress(values[deliveryColumn.id]) : "";
  const previousPickupAddress = pickupColumn ? locationAddress(previousValues?.[pickupColumn.id]) : "";
  const tripNumber = tripNumberColumn ? String(values[tripNumberColumn.id] || "") : "";
  const shortPlace = (address) => {
    const parts = String(address || "").split(",").map((part) => part.trim()).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "Unknown location";
  };
  let profileId = relation?.rowId || null;
  let assignedUserId = relation?.id || relation?.userId || null;
  if (profileId) {
    const driverBoard = (await pool.query("SELECT id,columns FROM tables WHERE workspace_id=$1 AND LOWER(name)='drivers' LIMIT 1", [table.workspace_id])).rows[0];
    const driver = driverBoard && (await pool.query("SELECT values FROM rows WHERE id=$1 AND table_id=$2", [profileId, driverBoard.id])).rows[0];
    if (driver) {
      assignedUserId = driver.values?._linkedUserId || null;
      if (!assignedUserId) {
        const peopleColumn = (driverBoard.columns || []).find((column) => column.type === "People" || String(column.name).toLowerCase() === "user");
        const person = peopleColumn && (Array.isArray(driver.values?.[peopleColumn.id]) ? driver.values[peopleColumn.id][0] : driver.values?.[peopleColumn.id]);
        assignedUserId = person?.id || person?.userId || null;
      }
    }
  }
  const next = { ...values, _workspaceId: table.workspace_id, _assignedDriverProfileId: profileId, _assignedDriverUserId: assignedUserId };
  if (assignedUserId) {
    await pool.query("INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,'driver') ON CONFLICT(workspace_id,user_id) DO UPDATE SET role='driver',updated_at=NOW()", [table.workspace_id, String(assignedUserId)]);
    const isNewAssignment = String(previousUserId || "") !== String(assignedUserId);
    const pickupChanged = Boolean(previousUserId) && pickupAddress !== previousPickupAddress;
    if (isNewAssignment || pickupChanged) {
      await pool.query("INSERT INTO notifications(id,recipient_id,sender_id,type,data,read,created_at) VALUES($1,$2,$3,$4,$5::jsonb,FALSE,NOW())", [
        randomUUID(),
        String(assignedUserId),
        String(actorId),
        isNewAssignment ? "pickup_assignment" : "pickup_updated",
        JSON.stringify({
          title: isNewAssignment ? `New trip: ${shortPlace(pickupAddress)} → ${shortPlace(deliveryAddress)}` : `Trip updated: ${tripNumber || "Trip"}`,
          message: `${tripNumber || "Trip"} · Pickup: ${pickupAddress || "Not set"} · Delivery: ${deliveryAddress || "Not set"}`,
          body: `${tripNumber || "Trip"} · Pickup: ${pickupAddress || "Not set"} · Delivery: ${deliveryAddress || "Not set"}`,
          workspaceId: table.workspace_id,
          tableId: table.id,
          tripId: rowId || null,
          taskId: rowId || null,
          portalPath: `/driver-trips?id=${encodeURIComponent(table.workspace_id)}`,
          tripNumber: tripNumber || null,
          pickupAddress: pickupAddress || null,
        }),
      ]).catch(() => undefined);
    }
  }
  if (previousUserId && String(previousUserId) !== String(assignedUserId || "")) {
    await pool.query("INSERT INTO notifications(id,recipient_id,sender_id,type,data,read,created_at) VALUES($1,$2,$3,'trip_reassignment',$4::jsonb,FALSE,NOW())", [randomUUID(), String(previousUserId), String(actorId), JSON.stringify({ title: `Trip reassigned: ${tripNumber || "Trip"}`, body: "This trip is no longer assigned to you.", workspaceId: table.workspace_id, tableId: table.id, portalPath: `/driver-trips?id=${encodeURIComponent(table.workspace_id)}` })]).catch(() => undefined);
  }
  return next;
}
