import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import { DRIVER_STATUSES, logisticsAccess } from "../../../_lib/logistics";

export const runtime = "nodejs";

const valueByName = (row, columns, names) => {
  const wanted = names.map((name) => name.toLowerCase());
  const column = columns.find((item) => wanted.includes(String(item.name).trim().toLowerCase()));
  return column ? row.values?.[column.id] : null;
};

const relationLabel = (value) => {
  const relation = Array.isArray(value) ? value[0] : value;
  return relation?.label || relation?.name || "";
};

const locationValue = (value) => {
  if (!value) return { address: "", latitude: null, longitude: null };
  if (typeof value === "string") return { address: value, latitude: null, longitude: null };
  const location = Array.isArray(value) ? value[0] : value;
  if (!location || typeof location !== "object") return { address: String(location || ""), latitude: null, longitude: null };
  const address = location.address || location.formattedAddress || location.formatted_address || location.label || location.name || location.value || "";
  const latitude = Number(location.latitude ?? location.lat ?? location.coordinates?.lat ?? location.geometry?.location?.lat);
  const longitude = Number(location.longitude ?? location.lng ?? location.lon ?? location.coordinates?.lng ?? location.geometry?.location?.lng);
  return {
    address: typeof address === "string" ? address : String(address || ""),
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
  };
};

function serializeTrip(row, columns, tableId) {
  const get = (...names) => valueByName(row, columns, names);
  const status = get("Status") || "Assigned";
  const pickup = locationValue(get("Pickup", "Pickup Address"));
  const delivery = locationValue(get("Delivery", "Delivery Address"));
  return {
    id: row.id,
    tableId,
    tripNumber: get("Trip Number", "Load ID") || row.id.slice(0, 8).toUpperCase(),
    name: get("Name") || "Trip",
    status,
    pickupAddress: pickup.address,
    pickupLatitude: Number(row.values?._pickupLatitude) || pickup.latitude,
    pickupLongitude: Number(row.values?._pickupLongitude) || pickup.longitude,
    deliveryAddress: delivery.address,
    deliveryLatitude: Number(row.values?._deliveryLatitude) || delivery.latitude,
    deliveryLongitude: Number(row.values?._deliveryLongitude) || delivery.longitude,
    pickupDate: get("Pickup Date", "Start Date"),
    deliveryDate: get("Delivery Date", "End Date"),
    truck: relationLabel(get("Truck")), trailer: get("Trailer") || "",
    cargo: get("Cargo", "Description") || "", cargoWeight: get("Cargo Weight"),
    contactPerson: get("Contact Person") || "", contactPhone: get("Contact Phone") || "",
    distance: get("Distance"), estimatedTravelTime: get("Estimated Travel Time") || "",
    instructions: get("Instructions") || "", documents: row.values?._deliveryDocuments || [],
    receiverName: row.values?._receiverName || "", deliveryComment: row.values?._deliveryComment || "",
    activity: row.values?.activity || [],
  };
}

async function context(workspaceId, userId) {
  const access = await logisticsAccess(workspaceId, userId);
  if (!access || access.role !== "driver") return null;
  const table = (await pool.query("SELECT * FROM tables WHERE workspace_id=$1 AND LOWER(name)=ANY($2) ORDER BY CASE WHEN LOWER(name)='trips' THEN 0 ELSE 1 END LIMIT 1", [workspaceId, ["trips", "loads"]])).rows[0];
  return table ? { access, table } : null;
}

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = new URL(req.url).searchParams.get("workspaceId");
  const tripId = new URL(req.url).searchParams.get("tripId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  const ctx = await context(workspaceId, user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await pool.query(`SELECT * FROM rows WHERE table_id=$1 AND values->>'_workspaceId'=$2 AND values->>'_assignedDriverUserId'=$3 ${tripId ? "AND id=$4" : ""} ORDER BY created_at DESC`, tripId ? [ctx.table.id, workspaceId, String(user.id), tripId] : [ctx.table.id, workspaceId, String(user.id)]);
  if (tripId && !result.rows[0]) return NextResponse.json({ error: "Trip not found or forbidden" }, { status: 404 });
  const trips = result.rows.map((row) => serializeTrip(row, ctx.table.columns || [], ctx.table.id));
  return NextResponse.json(tripId ? trips[0] : { role: ctx.access.role, workspace: { id: workspaceId, name: ctx.access.name }, trips });
}

export async function PATCH(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const workspaceId = String(body?.workspaceId || "");
  const tripId = String(body?.tripId || "");
  if (body?.action === "location") {
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return NextResponse.json({ error: "Valid location is required" }, { status: 400 });
    const ctx = await context(workspaceId, user.id);
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const row = (await pool.query("SELECT * FROM rows WHERE id=$1 AND table_id=$2 AND values->>'_workspaceId'=$3 AND values->>'_assignedDriverUserId'=$4", [tripId, ctx.table.id, workspaceId, String(user.id)])).rows[0];
    if (!row) return NextResponse.json({ error: "Trip not found or forbidden" }, { status: 404 });
    const liveLocation = { latitude, longitude, updatedAt: new Date().toISOString(), userId: String(user.id) };
    await pool.query("UPDATE rows SET values=jsonb_set(values,'{_driverLiveLocation}',$1::jsonb,true),updated_at=NOW() WHERE id=$2 AND table_id=$3", [JSON.stringify(liveLocation), tripId, ctx.table.id]);
    return NextResponse.json({ success: true, location: liveLocation });
  }
  const newStatus = String(body?.status || "");
  if (!DRIVER_STATUSES.includes(newStatus)) return NextResponse.json({ error: "Status is not allowed" }, { status: 400 });
  if (["Loaded", "Delivered"].includes(newStatus) && body?.confirmed !== true) return NextResponse.json({ error: "Confirmation is required" }, { status: 409 });
  const ctx = await context(workspaceId, user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const row = (await pool.query("SELECT * FROM rows WHERE id=$1 AND table_id=$2 AND values->>'_workspaceId'=$3 AND values->>'_assignedDriverUserId'=$4", [tripId, ctx.table.id, workspaceId, String(user.id)])).rows[0];
  if (!row) return NextResponse.json({ error: "Trip not found or forbidden" }, { status: 404 });
  const statusColumn = (ctx.table.columns || []).find((column) => String(column.name).trim().toLowerCase() === "status");
  const previousStatus = statusColumn ? row.values?.[statusColumn.id] : null;
  const now = new Date().toISOString();
  const values = { ...row.values, ...(statusColumn ? { [statusColumn.id]: newStatus } : {}), _receiverName: body.receiverName ?? row.values?._receiverName, _deliveryComment: body.deliveryComment ?? row.values?._deliveryComment, _deliveryDocuments: Array.isArray(body.documents) ? body.documents : (row.values?._deliveryDocuments || []), activity: [{ text: `Trip status changed from ${previousStatus || "Unknown"} to ${newStatus}`, time: now, user: user.name || user.email, userId: String(user.id), previousStatus, newStatus }, ...(row.values?.activity || [])] };
  await pool.query("UPDATE rows SET values=$1::jsonb,updated_at=NOW() WHERE id=$2 AND table_id=$3", [JSON.stringify(values), tripId, ctx.table.id]);
  await pool.query("INSERT INTO trip_status_history(id,workspace_id,trip_id,user_id,previous_status,new_status,metadata) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)", [randomUUID(), workspaceId, tripId, String(user.id), previousStatus, newStatus, JSON.stringify({ receiverName: body.receiverName || null })]);
  await pool.query("INSERT INTO notifications(id,recipient_id,sender_id,type,data,read,created_at) VALUES($1,$2,$3,'trip_status',$4::jsonb,FALSE,NOW())", [randomUUID(), String(ctx.access.owner_id), String(user.id), JSON.stringify({ title: `Trip ${newStatus}`, tripId, workspaceId })]).catch(() => undefined);
  return NextResponse.json({ success: true, trip: serializeTrip({ ...row, values }, ctx.table.columns || [], ctx.table.id) });
}
