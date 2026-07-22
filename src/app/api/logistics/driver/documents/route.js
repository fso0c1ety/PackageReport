import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import { logisticsAccess } from "../../../_lib/logistics";

export const runtime = "nodejs";

const columnByName = (columns, names) => {
  const wanted = names.map((name) => name.toLowerCase());
  return (columns || []).find((column) => wanted.includes(String(column.name).trim().toLowerCase()));
};

const setValue = (values, columns, names, value) => {
  const column = columnByName(columns, names);
  if (column && value !== undefined && value !== "") values[column.id] = value;
};

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const workspaceId = String(body?.workspaceId || "");
  const tripId = String(body?.tripId || "");
  const category = String(body?.category || "trip");
  const file = body?.file;
  if (!workspaceId || !tripId || !file?.url) return NextResponse.json({ error: "Workspace, trip and file are required" }, { status: 400 });

  const access = await logisticsAccess(workspaceId, user.id);
  if (!access || access.role !== "driver") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tripTable = (await pool.query("SELECT * FROM tables WHERE workspace_id=$1 AND LOWER(name)=ANY($2) ORDER BY CASE WHEN LOWER(name)='trips' THEN 0 ELSE 1 END LIMIT 1", [workspaceId, ["trips", "loads"]])).rows[0];
  const trip = tripTable && (await pool.query("SELECT * FROM rows WHERE id=$1 AND table_id=$2 AND values->>'_assignedDriverUserId'=$3", [tripId, tripTable.id, String(user.id)])).rows[0];
  if (!trip) return NextResponse.json({ error: "Trip not found or forbidden" }, { status: 404 });

  const storedFile = { id: file.id || randomUUID(), url: file.url, name: file.name || "Document", originalName: file.originalName || file.name || "Document", type: file.type || "application/octet-stream", size: Number(file.size) || 0, uploadedAt: new Date().toISOString(), uploadedBy: String(user.id), category };
  let targetTable = tripTable;
  let targetRowId = trip.id;

  if (category === "trip") {
    const values = { ...trip.values, _deliveryDocuments: [storedFile, ...(trip.values?._deliveryDocuments || [])] };
    const documentColumn = columnByName(tripTable.columns, ["Documents", "Document", "Files", "Attachments", "Receipt"]);
    if (documentColumn) values[documentColumn.id] = [storedFile, ...(Array.isArray(values[documentColumn.id]) ? values[documentColumn.id] : [])];
    await pool.query("UPDATE rows SET values=$1::jsonb,updated_at=NOW() WHERE id=$2 AND table_id=$3", [JSON.stringify(values), trip.id, tripTable.id]);
  } else {
    const tableNames = category === "fuel" ? ["fuel"] : ["expenses", "costs"];
    targetTable = (await pool.query("SELECT * FROM tables WHERE workspace_id=$1 AND LOWER(name)=ANY($2) LIMIT 1", [workspaceId, tableNames])).rows[0];
    if (!targetTable) return NextResponse.json({ error: `${category} board was not found` }, { status: 404 });
    targetRowId = randomUUID();
    const values = { _workspaceId: workspaceId, _tripId: trip.id, _assignedDriverUserId: String(user.id), _driverUploadCategory: category };
    const tripLabelColumn = columnByName(tripTable.columns, ["Trip Number", "Load ID", "Name"]);
    const tripLabel = trip.values?.[tripLabelColumn?.id] || trip.id.slice(0, 8).toUpperCase();
    setValue(values, targetTable.columns, ["Date"], body.date || new Date().toISOString().slice(0, 10));
    setValue(values, targetTable.columns, ["Trip", "Load"], [{ id: trip.id, label: tripLabel, tableId: tripTable.id }]);
    setValue(values, targetTable.columns, ["Driver", "People"], [{ id: String(user.id), name: user.name || user.email, email: user.email }]);
    setValue(values, targetTable.columns, ["Receipt", "File", "Document", "Attachments"], [storedFile]);
    if (category === "fuel") {
      setValue(values, targetTable.columns, ["Fuel Record", "Name"], `FUEL-${Date.now().toString().slice(-6)}`);
      setValue(values, targetTable.columns, ["Liters", "Quantity"], Number(body.liters) || 0);
      setValue(values, targetTable.columns, ["Price per Liter", "Price per Litre"], Number(body.pricePerLiter) || 0);
      setValue(values, targetTable.columns, ["Total", "Amount"], Number(body.total) || ((Number(body.liters) || 0) * (Number(body.pricePerLiter) || 0)));
      setValue(values, targetTable.columns, ["Odometer KM", "Odometer"], Number(body.odometer) || 0);
    } else {
      setValue(values, targetTable.columns, ["Expense Number", "Name"], `EXP-${Date.now().toString().slice(-6)}`);
      setValue(values, targetTable.columns, ["Type"], body.expenseType || "Driver expense");
      setValue(values, targetTable.columns, ["Description"], body.description || "Driver uploaded expense");
      setValue(values, targetTable.columns, ["Amount", "Total"], Number(body.amount) || 0);
      setValue(values, targetTable.columns, ["Status"], "Pending");
    }
    await pool.query("INSERT INTO rows(id,table_id,values,created_by,created_at,updated_at) VALUES($1,$2,$3::jsonb,$4,NOW(),NOW())", [targetRowId, targetTable.id, JSON.stringify(values), String(user.id)]);
  }

  const title = category === "fuel" ? "New fuel receipt" : category === "expense" ? "New driver expense" : "New trip document";
  await pool.query("INSERT INTO notifications(id,recipient_id,sender_id,type,data,read,created_at) VALUES($1,$2,$3,'driver_document',$4::jsonb,FALSE,NOW())", [randomUUID(), String(access.owner_id), String(user.id), JSON.stringify({ title, workspaceId, tripId, tableId: targetTable.id, rowId: targetRowId, fileName: storedFile.name })]).catch(() => undefined);
  return NextResponse.json({ success: true, file: storedFile, tableId: targetTable.id, rowId: targetRowId });
}
