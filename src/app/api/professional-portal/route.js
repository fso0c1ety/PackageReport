import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAuthenticatedUser, pool } from "../_lib/server";
import { requireBoardPermission, rowMatchesRecordAccess } from "../_lib/authorization";
import { listUserMemberships, selectPortalMembership } from "../_lib/universalRoles";
import { resolvePortalConfig } from "../../../portal-engine/registry";
import { portalWriteAction, portalWriteActionOptions } from "../../../portal-engine/writeActions";
import { portalRecordCapability, validPortalCapability } from "../_lib/portalCapability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      if (portalType === "teacher" && String(row.values?._classTeacherUserId || row.values?.classTeacherUserId || "") === String(user.id)) context.childIds.add(String(row.id));
      if (portalType === "parent" && context.childIds.has(String(row.id))) ids(value(row, childrenTable, "Group")).forEach((id) => context.groupIds.add(id));
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
  const portalScopeField = { teacher:"_classTeacherUserId", parent:"_linkedParentUserId", doctor:"_assignedDoctorUserId", patient:"_linkedPatientUserId", client:"clientCompanyId" }[portalType];
  const portalScopeValue = portalType === "client" ? String(membership.companyId || "") : String(user.id);
  const relationshipVisible = (entity, row, table) => {
    if (portalType === "teacher") {
      if (entity === "Groups") return context.groupIds.has(String(row.id));
      if (entity === "Children") return context.childIds.has(String(row.id));
      if (["Attendance","Documents"].includes(entity)) return ids(value(row, table, "Child")).some((id) => context.childIds.has(id));
      if (entity === "Meals") return ids(value(row, table, "Assigned Groups")).some((id) => context.groupIds.has(id));
      if (entity === "Activities") return ids(value(row, table, "Group")).some((id) => context.groupIds.has(id));
    }
    if (portalType === "parent") {
      if (entity === "Children") return context.childIds.has(String(row.id));
      if (["Attendance","Documents","Payments"].includes(entity)) return ids(value(row, table, "Child")).some((id) => context.childIds.has(id));
      if (entity === "Activities") return ids(value(row, table, "Children")).some((id) => context.childIds.has(id)) || ids(value(row, table, "Group")).some((id) => context.groupIds.has(id));
      if (entity === "Meals") return ids(value(row, table, "Assigned Groups")).some((id) => context.groupIds.has(id));
    }
    if (portalType === "doctor") {
      if (entity === "Patients") return context.patientIds.has(String(row.id));
      if (["Appointments","Treatments"].includes(entity)) return hasUser(value(row, table, "Dentist"), user);
      if (entity === "Lab Requests") return context.patientIds.has(ids(value(row, table, "Patient"))[0]);
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
      .filter((row) => {
        const explicitScope = portalScopeField ? row.values?.[portalScopeField] : null;
        if (explicitScope != null && String(explicitScope) !== portalScopeValue) return false;
        const related = rowMatchesRecordAccess(row, scopedBoard, user.id) || relationshipVisible(entity, row, table);
        if (!related) return false;
        if (portalType === "parent" && entity === "Documents") return ["approved","shared","parent","shareable"].includes(normalize(value(row, table, "Visibility") || value(row, table, "Status")));
        if (portalType === "parent" && entity === "Activities") return ["parent","shared","shareable","approved"].includes(normalize(value(row, table, "Visibility")));
        if (portalType === "patient" && entity === "Documents") return ["shared","patient","approved"].includes(normalize(value(row, table, "Visibility") || value(row, table, "Status")));
        if (portalType === "patient" && entity === "Lab Requests") return Boolean(value(row, table, "Share With Patient")) && normalize(value(row, table, "Status")) !== "cancelled";
        return true;
      })
      .slice(0, 50);
    const visible = new Set((config.visibleFields[entity] || []).map(normalize));
    const hidden = new Set((config.hiddenFields[entity] || []).map(normalize));
    const columns = (table.columns || []).filter((column) => visible.has(normalize(column.name)) && !hidden.has(normalize(column.name)));
    entities.push({ entity, name: table.name, records: rows.map((row) => ({ id: row.id, writeToken: portalRecordCapability(String(user.id),workspaceId,portalType,entity,String(row.id)), updatedAt: row.updated_at, fields: Object.fromEntries(columns.map((column) => [column.name, safeValue(row.values?.[column.id])])) })) });
  }
  const timeline = [];
  if (portalType === "parent") {
    for (const entity of entities) for (const record of entity.records || []) {
      if (!["Attendance", "Meals", "Activities", "Documents"].includes(entity.entity)) continue;
      const dateValue = record.fields?.["Date / Time"] || record.fields?.Date || record.fields?.["Upload Date"] || record.updatedAt;
      timeline.push({ id: `${entity.entity}:${record.id}`, at: dateValue, type: entity.entity === "Documents" ? "Photo / Document" : entity.entity, description: String(record.fields?.Title || record.fields?.Description || record.fields?.["Present / Absent"] || record.fields?.["Document Type"] || `${entity.entity} update`).slice(0, 180), attachment: record.fields?.File || record.fields?.Attachments || null });
    }
    for (const child of await rowsFor("Children")) if (context.childIds.has(String(child.id))) {
      for (const sleep of Array.isArray(child.values?._sleepEvents) ? child.values._sleepEvents : []) if (sleep?.shareable) {
        timeline.push({ id: `sleep-start:${sleep.id}`, at: sleep.startedAt, type: "Sleep Started", description: "Sleep started" });
        if (sleep.endedAt) timeline.push({ id: `sleep-end:${sleep.id}`, at: sleep.endedAt, type: "Sleep Ended", description: `Sleep ended after ${Number(sleep.durationMinutes) || 0} minutes` });
      }
      for (const note of Array.isArray(child.values?._teacherObservations) ? child.values._teacherObservations : []) if (note?.shareable) timeline.push({ id: `observation:${note.createdAt}`, at: note.createdAt, type: "Observation", description: String(note.text || "Teacher observation").slice(0, 180) });
    }
    timeline.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
  }
  return NextResponse.json({ membership: { workspaceId, workspaceName: membership.workspaceName, portalType: membership.portalType }, config: { id: config.id, name: config.name, widgets: config.widgets, navigation: config.navigation, featureFlags: config.featureFlags, writeActions: portalWriteActionOptions(portalType) }, entities, timeline: timeline.slice(0, 100) });
}

function sanitizeWriteValues(definition, input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  return Object.fromEntries(definition.fields.filter((field) => Object.prototype.hasOwnProperty.call(source, field)).map((field) => [field, source[field]]));
}

function columnPatch(table, valuesToWrite) {
  const patch = {};
  for (const [name, entry] of Object.entries(valuesToWrite)) {
    const target = column(table, name);
    if (target) patch[target.id] = entry;
  }
  return patch;
}

async function writeMembership(user, workspaceId, portalType) {
  const memberships = await listUserMemberships(pool, user.id);
  const membership = selectPortalMembership(memberships, { workspaceId, portalType });
  if (!membership || membership.portalType !== portalType) return null;
  const config = resolvePortalConfig(membership);
  return config?.portalType === portalType ? { membership, config } : null;
}

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const workspaceId = String(body.workspaceId || "");
  const portalType = String(body.portalType || "");
  const action = String(body.action || "");
  const definition = portalWriteAction(portalType, action);
  if (!workspaceId || !portalType || !definition) return NextResponse.json({ error: "Write action is not allowed" }, { status: 400 });
  const access = await writeMembership(user, workspaceId, portalType);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tableNames = access.config.entityScopes[definition.entity] || [definition.entity];
  const table = (await pool.query("SELECT id,name,columns,workspace_id FROM tables WHERE workspace_id=$1 AND LOWER(name)=ANY($2) LIMIT 1", [workspaceId, tableNames.map(normalize)])).rows[0];
  if (!table) return NextResponse.json({ error: "Entity is unavailable" }, { status: 404 });
  const board = await requireBoardPermission(pool, user.id, table.id, definition.mode === "update" ? "editor" : "viewer");
  if (!board || String(board.workspace_id) !== workspaceId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const expectedScope = portalType === "client" ? String(access.membership.companyId || "") : String(user.id);
  if (!expectedScope) return NextResponse.json({ error: "Portal scope is incomplete" }, { status: 403 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const recordId = String(body.recordId || "");
    const subjectId = String(body.subjectId || "");
    let row = null;
    if (["update", "append", "message", "sleep_start", "sleep_end"].includes(definition.mode)) {
      row = (await client.query("SELECT id,table_id,values,created_by,created_at,updated_at FROM rows WHERE id=$1 AND table_id=$2 FOR UPDATE", [recordId, table.id])).rows[0];
      const actualScope = String(row?.values?.[definition.scopeField] || "");
      const capabilityAllowed = row && validPortalCapability(body.writeToken,user.id,workspaceId,portalType,definition.entity,recordId);
      if (!row || (actualScope !== expectedScope && !capabilityAllowed)) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: row ? "Record scope is forbidden" : "Record not found" }, { status: 404 });
      }
    }

    const accepted = sanitizeWriteValues(definition, body.values);
    let resultId = recordId;
    if (definition.mode === "update") {
      const patch = columnPatch(table, accepted);
      await client.query("UPDATE rows SET values=values||$1::jsonb,updated_at=NOW() WHERE id=$2 AND table_id=$3", [JSON.stringify(patch), recordId, table.id]);
    } else if (["append", "message"].includes(definition.mode)) {
      const event = { ...accepted, actorId: String(user.id), createdAt: new Date().toISOString(), role: portalType };
      const current = Array.isArray(row.values?.[definition.targetField || "_portalMessages"]) ? row.values[definition.targetField || "_portalMessages"] : [];
      const patch = { [definition.targetField || "_portalMessages"]: [event, ...current].slice(0, 100) };
      await client.query("UPDATE rows SET values=values||$1::jsonb,updated_at=NOW() WHERE id=$2 AND table_id=$3", [JSON.stringify(patch), recordId, table.id]);
    } else if (["sleep_start", "sleep_end"].includes(definition.mode)) {
      const now = new Date();
      const current = Array.isArray(row.values?.[definition.targetField]) ? row.values[definition.targetField] : [];
      if (definition.mode === "sleep_start" && current.some((event) => event?.type === "sleep" && !event?.endedAt)) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Sleep is already in progress" }, { status: 409 });
      }
      let events;
      if (definition.mode === "sleep_start") {
        events = [{ id: randomUUID(), type: "sleep", startedAt: now.toISOString(), endedAt: null, durationMinutes: null, teacherId: String(user.id), shareable: true }, ...current];
      } else {
        let closed = false;
        events = current.map((event) => {
          if (closed || event?.type !== "sleep" || event?.endedAt) return event;
          closed = true;
          const startedAt = new Date(event.startedAt);
          return { ...event, endedAt: now.toISOString(), durationMinutes: Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 60000)) };
        });
        if (!closed) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "No sleep is currently in progress" }, { status: 409 });
        }
      }
      await client.query("UPDATE rows SET values=values||$1::jsonb,updated_at=NOW() WHERE id=$2 AND table_id=$3", [JSON.stringify({ [definition.targetField]: events.slice(0, 100) }), recordId, table.id]);
    } else if (definition.mode === "create") {
      const subjectNames = access.config.entityScopes[definition.subjectEntity] || [definition.subjectEntity];
      const subjectTable = (await client.query("SELECT id,name,columns FROM tables WHERE workspace_id=$1 AND LOWER(name)=ANY($2) LIMIT 1", [workspaceId, subjectNames.map(normalize)])).rows[0];
      const subject = subjectTable && (await client.query("SELECT id,table_id,values,created_by,created_at,updated_at FROM rows WHERE id=$1 AND table_id=$2", [subjectId, subjectTable.id])).rows[0];
      const subjectCapability = subject && validPortalCapability(body.writeToken,user.id,workspaceId,portalType,definition.subjectEntity,subjectId);
      if (!subject || (String(subject.values?.[definition.scopeField] || "") !== expectedScope && !subjectCapability)) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Related record not found or forbidden" }, { status: 404 });
      }
      resultId = randomUUID();
      const relationColumn = column(table, definition.relationField);
      const valuesToInsert = { ...columnPatch(table, accepted), [definition.scopeField]: expectedScope };
      if (portalType === "teacher" && definition.entity === "Documents") valuesToInsert._linkedParentUserId = subject.values?._linkedParentUserId || null;
      if (portalType === "doctor" && definition.entity === "Lab Requests") valuesToInsert._linkedPatientUserId = subject.values?._linkedPatientUserId || subject.values?._linkedUserId || null;
      if (relationColumn) valuesToInsert[relationColumn.id] = [{ id: subjectId, rowId: subjectId }];
      if (portalType === "client") valuesToInsert.clientCompanyId = expectedScope;
      await client.query("INSERT INTO rows(id,table_id,values,created_by,created_at,updated_at) VALUES($1,$2,$3::jsonb,$4,NOW(),NOW())", [resultId, table.id, JSON.stringify(valuesToInsert), String(user.id)]);
    }

    const safeSubject = `${portalType}:${action}`;
    await client.query("INSERT INTO activity_logs(id,recipients,subject,html,timestamp,table_id,task_id,status) VALUES($1,'[]'::jsonb,$2,$3,$4,$5,$6,'sent')", [randomUUID(), safeSubject, definition.sensitive ? null : `${user.name || user.email || portalType} performed ${action}`, Date.now(), table.id, resultId]);
    if (definition.notifyManager || definition.notifyExternal) {
      const ownerId = String(board.workspace_owner_id || "");
      if (ownerId && ownerId !== String(user.id)) await client.query("INSERT INTO notifications(id,recipient_id,sender_id,type,data,read,created_at) VALUES($1,$2,$3,'portal_write',$4::jsonb,FALSE,NOW())", [randomUUID(), ownerId, String(user.id), JSON.stringify({ title: `${portalType} portal update`, body: action.replaceAll(":", " "), workspaceId, tableId: table.id, taskId: resultId, portalType })]);
    }
    await client.query("COMMIT");
    return NextResponse.json({ success: true, action, recordId: resultId });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("[professional-portal-write]", error instanceof Error ? error.message : "failed");
    return NextResponse.json({ error: "Portal write failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
