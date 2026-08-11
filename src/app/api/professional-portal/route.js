import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";
import { requireBoardPermission, rowMatchesRecordAccess } from "../_lib/authorization";
import { listUserMemberships, selectPortalMembership } from "../_lib/universalRoles";
import { resolvePortalConfig } from "../../../portal-engine/registry";

export const runtime = "nodejs";

const normalize = (value) => String(value || "").trim().toLowerCase();
const column = (table, name) => (table?.columns || []).find((item) => normalize(item.name) === normalize(name));
const value = (row, table, name) => { const target = column(table, name); return target ? row?.values?.[target.id] : undefined; };
const values = (entry) => Array.isArray(entry) ? entry : entry == null ? [] : [entry];
const ids = (entry) => values(entry).map((item) => String(typeof item === "object" ? item?.rowId || item?.id || item?.userId || "" : item)).filter(Boolean);
const hasUser = (entry, user) => values(entry).some((item) => String(typeof item === "object" ? item?.userId || item?.id || "" : item) === String(user.id)
  || normalize(typeof item === "object" ? item?.email : item) === normalize(user.email));
const safeValue = (value) => {
  if (value == null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.slice(0, 10).map(safeValue);
  if (typeof value === "object") {
    const allowed = ["id", "label", "name", "url", "type", "size", "address", "latitude", "longitude", "start", "end", "currency", "amount"];
    return Object.fromEntries(allowed.filter((key) => value[key] != null).map((key) => [key, safeValue(value[key])]));
  }
  return String(value);
};

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const workspaceId = String(url.searchParams.get("workspaceId") || "");
  const portalType = String(url.searchParams.get("portalType") || "");
  if (!workspaceId || !portalType) return NextResponse.json({ error: "workspaceId and portalType are required" }, { status: 400 });

  const memberships = await listUserMemberships(pool, user.id);
  const membership = selectPortalMembership(memberships, { workspaceId, portalType });
  if (!membership) return NextResponse.json({ error: "Portal is not assigned to this account" }, { status: 403 });
  const config = resolvePortalConfig(membership);
  if (!config || config.portalType !== membership.portalType) return NextResponse.json({ error: "Portal configuration is unavailable" }, { status: 404 });

  const requestedEntities = Object.keys(config.entityScopes);
  const relationshipTables = (await pool.query("SELECT id,name,columns FROM tables WHERE workspace_id=$1", [workspaceId])).rows;
  const byName = new Map(relationshipTables.map((table) => [normalize(table.name), table]));
  const rowCache = new Map();
  const rowsFor = async (name) => {
    const table = byName.get(normalize(name));
    if (!table) return [];
    if (!rowCache.has(table.id)) rowCache.set(table.id, (await pool.query("SELECT id,values,created_at,updated_at,created_by FROM rows WHERE table_id=$1 ORDER BY updated_at DESC LIMIT 1000", [table.id])).rows);
    return rowCache.get(table.id);
  };
  const context = { parentIds:new Set(),childIds:new Set(),groupIds:new Set(),patientIds:new Set(),clientIds:new Set() };
  if (["teacher","parent"].includes(portalType)) {
    const parentsTable = byName.get("parents");
    for (const row of await rowsFor("Parents")) if (String(row.values?._linkedUserId || "") === String(user.id) || normalize(value(row, parentsTable, "Email")) === normalize(user.email)) context.parentIds.add(String(row.id));
    const groupsTable = byName.get("groups");
    for (const row of await rowsFor("Groups")) if (hasUser(value(row, groupsTable, "Educator"), user) || hasUser(value(row, groupsTable, "Assistant"), user)) context.groupIds.add(String(row.id));
    const childrenTable = byName.get("children");
    for (const row of await rowsFor("Children")) {
      if (ids(value(row, childrenTable, "Parent")).some((id) => context.parentIds.has(id)) || String(row.values?._linkedParentUserId || "") === String(user.id)) context.childIds.add(String(row.id));
      if (ids(value(row, childrenTable, "Group")).some((id) => context.groupIds.has(id))) context.childIds.add(String(row.id));
    }
  }
  if (["doctor","patient"].includes(portalType)) {
    const patientsTable = byName.get("patients");
    for (const row of await rowsFor("Patients")) if (String(row.values?._linkedUserId || row.values?._linkedPatientUserId || "") === String(user.id) || normalize(value(row, patientsTable, "Email")) === normalize(user.email)) context.patientIds.add(String(row.id));
    if (portalType === "doctor") for (const boardName of ["Appointments","Treatments"]) {
      const board = byName.get(normalize(boardName));
      for (const row of await rowsFor(boardName)) if (hasUser(value(row, board, "Dentist"), user)) ids(value(row, board, "Patient")).forEach((id) => context.patientIds.add(id));
    }
  }
  if (portalType === "client") {
    const clientsTable = byName.get("clients");
    for (const row of await rowsFor("Clients")) if (String(row.values?._linkedUserId || row.values?._clientCompanyId || "") === String(user.id) || normalize(value(row, clientsTable, "Email")) === normalize(user.email) || String(row.id) === String(membership.companyId || "")) context.clientIds.add(String(row.id));
  }
  const relationshipVisible = (entity, row, table) => {
    if (portalType === "teacher") {
      if (entity === "Groups") return context.groupIds.has(String(row.id));
      if (entity === "Children") return context.childIds.has(String(row.id));
      if (["Attendance","Documents"].includes(entity)) return ids(value(row, table, "Child")).some((id) => context.childIds.has(id));
      if (entity === "Meals") return ids(value(row, table, "Assigned Groups")).some((id) => context.groupIds.has(id));
    }
    if (portalType === "parent") {
      if (entity === "Children") return context.childIds.has(String(row.id));
      if (["Attendance","Documents","Payments"].includes(entity)) return ids(value(row, table, "Child")).some((id) => context.childIds.has(id));
      if (entity === "Meals") return false;
    }
    if (portalType === "doctor") {
      if (entity === "Patients") return context.patientIds.has(String(row.id));
      if (["Appointments","Treatments"].includes(entity)) return hasUser(value(row, table, "Dentist"), user);
    }
    if (portalType === "patient") return ids(value(row, table, "Patient")).some((id) => context.patientIds.has(id));
    if (portalType === "client") {
      const explicitCompanyId = String(row.values?.clientCompanyId || "");
      if (explicitCompanyId) return context.clientIds.has(explicitCompanyId);
      return ids(value(row, table, "Client")).some((id) => context.clientIds.has(id));
    }
    return false;
  };
  const entities = [];
  for (const entity of requestedEntities) {
    const permittedNames = config.entityScopes[entity] || [entity];
    const table = (await pool.query("SELECT id,name,columns FROM tables WHERE workspace_id=$1 AND LOWER(name)=ANY($2) LIMIT 1", [workspaceId, permittedNames.map(normalize)])).rows[0];
    if (!table) { entities.push({ entity, name: entity, records: [], unavailable: true }); continue; }
    const authorizedBoard = await requireBoardPermission(pool, user.id, table.id, "viewer");
    if (!authorizedBoard || String(authorizedBoard.workspace_id) !== workspaceId) { entities.push({ entity, name: table.name, records: [], forbidden: true }); continue; }
    const scopedBoard = { ...authorizedBoard, board_record_access: config.recordScopes[entity] || authorizedBoard.board_record_access || authorizedBoard.record_access };
    const rows = (await pool.query("SELECT id,values,created_at,updated_at,created_by FROM rows WHERE table_id=$1 ORDER BY updated_at DESC LIMIT 250", [table.id])).rows
      .filter((row) => rowMatchesRecordAccess(row, scopedBoard, user.id) || relationshipVisible(entity, row, table))
      .slice(0, 50);
    const visible = new Set((config.visibleFields[entity] || []).map(normalize));
    const hidden = new Set((config.hiddenFields[entity] || []).map(normalize));
    const columns = (table.columns || []).filter((column) => visible.has(normalize(column.name)) && !hidden.has(normalize(column.name)));
    entities.push({ entity, name: table.name, records: rows.map((row) => ({ id: row.id, updatedAt: row.updated_at, fields: Object.fromEntries(columns.map((column) => [column.name, safeValue(row.values?.[column.id])])) })) });
  }
  return NextResponse.json({ membership: { workspaceId, workspaceName: membership.workspaceName, portalType: membership.portalType }, config: { id: config.id, name: config.name, widgets: config.widgets, navigation: config.navigation, featureFlags: config.featureFlags }, entities });
}
