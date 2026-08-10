import crypto, { randomUUID } from "node:crypto";
import { getWorkspaceTemplateManifest, WORKSPACE_TEMPLATES } from "../../../workspaceTemplates";
import { hashAccountToken, publicAppUrl } from "./accountTokens";
import { sendEmail } from "./mailer";

const TEMPLATE_ALIASES = Object.freeze({
  marketing_agency: "marketing_agency", logistics: "freight_broker", freight: "freight_broker",
  fleet: "fleet_management", dental: "dental_clinic", medical: "medical_clinic",
  daycare: "kindergarten_nursery", construction: "construction", hotel: "hotel",
  restaurant: "restaurant", retail: "retail_store", manufacturing: "manufacturing",
});

export function recommendDemoTemplate(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const key = TEMPLATE_ALIASES[normalized] || normalized;
  return WORKSPACE_TEMPLATES.some((template) => template.key === key && key !== "blank") ? key : null;
}

const safeError = (error) => String(error?.message || error || "Email delivery failed").slice(0, 1000);
const avatarFor = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true`;

function valueForSeed(raw, relations, user) {
  if (raw?.__relationBoard) {
    const relation = relations.get(raw.__relationBoard);
    return relation ? [{ tableId: relation.tableId, rowId: relation.rowId, label: relation.label, tableName: raw.__relationBoard }] : [];
  }
  if (raw?.__currentUser) return [{ id: String(user.id), name: user.name, email: user.email }];
  return raw;
}

export async function sendDemoAccessEmail({ pool, req, request }) {
  const existingActive = Boolean(request.user_password);
  let actionUrl = `${publicAppUrl(req)}/workspace/?id=${encodeURIComponent(request.demo_workspace_id)}`;
  if (!existingActive) {
    const rawToken = crypto.randomBytes(32).toString("base64url");
    await pool.query("DELETE FROM account_activation_tokens WHERE user_id=$1 OR expires_at<NOW()", [request.prospect_user_id]);
    await pool.query(`INSERT INTO account_activation_tokens(id,user_id,token_hash,pending_profile,expires_at)
      VALUES($1,$2,$3,$4::jsonb,NOW()+INTERVAL '24 hours')`, [randomUUID(), request.prospect_user_id, hashAccountToken(rawToken), JSON.stringify({ name: request.name, company: request.company_name, setupPassword: true })]);
    actionUrl = `${publicAppUrl(req)}/activate-account/?token=${encodeURIComponent(rawToken)}&setup=demo`;
  }
  const expiry = request.demo_expires_at ? new Date(request.demo_expires_at).toLocaleDateString("en-GB") : "7 days from activation";
  const templateName = getWorkspaceTemplateManifest(request.recommended_template).name;
  const button = existingActive ? "Open Demo Workspace" : "Set Up Demo Access";
  await sendEmail({
    to: request.email, subject: "Your Smart Manage demo is ready",
    text: `Hi ${request.name},\n\nYour Smart Manage demo workspace is ready.\n\nWe've prepared a workspace based on the needs of ${request.company_name} using the ${templateName} setup.\n\nYour demo includes professional sample workflows so you can explore how Smart Manage can work for your business.\n\n${button}: ${actionUrl}\n\nDemo workspace: ${request.workspace_name}\nAccess available until: ${expiry}\n\nSmart Manage\nby Aximo Studio`,
    html: `<h2>Your Smart Manage demo is ready</h2><p>Hi ${request.name},</p><p>We've prepared <b>${request.workspace_name}</b> using the ${templateName} setup with professional fictional sample workflows.</p><p><a href="${actionUrl}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:white;text-decoration:none;border-radius:8px">${button}</a></p><p>Access available until: ${expiry}</p><p>Smart Manage<br/>by Aximo Studio</p>`,
  });
  await pool.query("UPDATE demo_requests SET status='demo_sent',access_email_status='sent',access_email_last_error=NULL,access_email_sent_at=NOW(),updated_at=NOW() WHERE id=$1", [request.id]);
  return { actionUrl, existingActive };
}

export async function provisionDemoRequest({ pool, req, requestId, actorId, templateKey, durationDays = 7, workspaceName }) {
  const client = await pool.connect();
  let result;
  try {
    await client.query("BEGIN");
    const locked = (await client.query("SELECT * FROM demo_requests WHERE id=$1 FOR UPDATE", [requestId])).rows[0];
    if (!locked) throw Object.assign(new Error("Demo request not found"), { status: 404 });
    const selectedTemplate = recommendDemoTemplate(templateKey || locked.recommended_template || locked.business_type);
    if (!selectedTemplate) throw Object.assign(new Error("An administrator must select a valid template"), { status: 400 });
    if (locked.demo_workspace_id) {
      result = (await client.query(`SELECT dr.*,w.name workspace_name,w.demo_expires_at,u.password user_password
        FROM demo_requests dr JOIN workspaces w ON w.id=dr.demo_workspace_id JOIN users u ON u.id=dr.prospect_user_id WHERE dr.id=$1`, [requestId])).rows[0];
      await client.query("COMMIT");
    } else {
      await client.query("UPDATE demo_requests SET status='demo_preparing',recommended_template=$2,provisioned_by=$3,updated_at=NOW() WHERE id=$1", [requestId, selectedTemplate, actorId]);
      const existingUser = (await client.query("SELECT id,name,email,password FROM users WHERE LOWER(email)=LOWER($1) FOR UPDATE", [locked.email])).rows[0];
      const prospect = existingUser || (await client.query(`INSERT INTO users(id,name,email,avatar,password,email_verified_at)
        VALUES($1,$2,$3,$4,NULL,NULL) RETURNING id,name,email,password`, [randomUUID(), locked.name, locked.email, avatarFor(locked.name)])).rows[0];
      const template = getWorkspaceTemplateManifest(selectedTemplate);
      const workspaceId = randomUUID();
      const expiresAt = new Date(Date.now() + Math.max(1, Math.min(90, Number(durationDays) || 7)) * 86400000);
      const finalName = String(workspaceName || `${locked.company_name} — Demo`).trim().slice(0, 160);
      await client.query(`INSERT INTO workspaces(id,name,owner_id,template_key,is_demo,demo_request_id,demo_expires_at,demo_metadata)
        VALUES($1,$2,$3,$4,TRUE,$5,$6,$7::jsonb)`, [workspaceId, finalName, prospect.id, selectedTemplate, requestId, expiresAt, JSON.stringify({ source: "request_demo", template_key: selectedTemplate, provisioned_by: actorId, seed_version: 1 })]);
      await client.query(`INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,job_roles,portal_type,landing_route,record_access)
        VALUES($1,$2,'owner','owner','[]'::jsonb,'standard','/dashboard','{"scope":"all_permitted"}'::jsonb)
        ON CONFLICT(workspace_id,user_id) DO NOTHING`, [workspaceId, prospect.id]);
      const relations = new Map();
      const boardColumns = new Map();
      for (const board of template.boards) {
        const tableId = randomUUID(); const columns = board.columns.map((column, order) => ({ ...column, id: randomUUID(), order }));
        await client.query("INSERT INTO tables(id,name,workspace_id,columns,created_at) VALUES($1,$2,$3,$4,$5)", [tableId, board.name, workspaceId, JSON.stringify(columns), Date.now()]);
        const seed = board.rows?.[0];
        if (seed) { const rowId = randomUUID(); relations.set(board.name, { tableId, rowId, label: String(seed.Name || `Sample ${board.name}`) }); await client.query("INSERT INTO rows(id,table_id,values,created_by,created_at) VALUES($1,$2,'{}'::jsonb,$3,NOW())", [rowId, tableId, prospect.id]); }
        boardColumns.set(board.name, columns);
      }
      for (const board of template.boards) {
        const target = relations.get(board.name); const seed = board.rows?.[0]; if (!target || !seed) continue;
        const values = {};
        for (const column of boardColumns.get(board.name) || []) if (Object.prototype.hasOwnProperty.call(seed, column.name)) values[column.id] = valueForSeed(seed[column.name], relations, prospect);
        await client.query("UPDATE rows SET values=$1::jsonb WHERE id=$2", [JSON.stringify(values), target.rowId]);
      }
      await client.query(`UPDATE demo_requests SET status='demo_ready',recommended_template=$2,demo_workspace_id=$3,prospect_user_id=$4,
        provisioned_at=NOW(),access_email_status='pending',updated_at=NOW() WHERE id=$1`, [requestId, selectedTemplate, workspaceId, prospect.id]);
      await client.query("INSERT INTO demo_request_events(id,demo_request_id,actor_id,event_type,data) VALUES($1,$2,$3,'demo_provisioned',$4::jsonb)", [randomUUID(), requestId, actorId, JSON.stringify({ workspaceId, templateKey: selectedTemplate })]);
      await client.query("COMMIT");
      result = { ...locked, id: requestId, recommended_template: selectedTemplate, demo_workspace_id: workspaceId, prospect_user_id: prospect.id, user_password: prospect.password, workspace_name: finalName, demo_expires_at: expiresAt };
    }
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; } finally { client.release(); }
  try { await sendDemoAccessEmail({ pool, req, request: result }); return { ...result, status: "demo_sent", access_email_status: "sent" }; }
  catch (error) { await pool.query("UPDATE demo_requests SET status='demo_ready',access_email_status='failed',access_email_last_error=$2,updated_at=NOW() WHERE id=$1", [requestId, safeError(error)]); return { ...result, status: "demo_ready", access_email_status: "failed", emailError: safeError(error) }; }
}

export async function resetDemoWorkspace({ pool, requestId, actorId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const request = (await client.query(`SELECT dr.*,w.template_key,w.owner_id FROM demo_requests dr JOIN workspaces w ON w.id=dr.demo_workspace_id
      WHERE dr.id=$1 AND w.is_demo=TRUE FOR UPDATE`, [requestId])).rows[0];
    if (!request) throw Object.assign(new Error("Demo workspace not found"), { status: 404 });
    const user = (await client.query("SELECT id,name,email FROM users WHERE id=$1", [request.owner_id])).rows[0];
    const template = getWorkspaceTemplateManifest(request.template_key);
    const tables = (await client.query("SELECT id,name,columns FROM tables WHERE workspace_id=$1", [request.demo_workspace_id])).rows;
    const relations = new Map();
    for (const board of template.boards) {
      const table = tables.find((item) => item.name === board.name); const seed = board.rows?.[0]; if (!table || !seed) continue;
      await client.query("DELETE FROM rows WHERE table_id=$1", [table.id]); const rowId = randomUUID();
      relations.set(board.name, { tableId: table.id, rowId, label: String(seed.Name || `Sample ${board.name}`) });
      await client.query("INSERT INTO rows(id,table_id,values,created_by,created_at) VALUES($1,$2,'{}'::jsonb,$3,NOW())", [rowId, table.id, user.id]);
    }
    for (const board of template.boards) {
      const target = relations.get(board.name); const table = tables.find((item) => item.name === board.name); const seed = board.rows?.[0]; if (!target || !table || !seed) continue;
      const values = {}; for (const column of table.columns || []) if (Object.prototype.hasOwnProperty.call(seed, column.name)) values[column.id] = valueForSeed(seed[column.name], relations, user);
      await client.query("UPDATE rows SET values=$1::jsonb WHERE id=$2", [JSON.stringify(values), target.rowId]);
    }
    await client.query("INSERT INTO demo_request_events(id,demo_request_id,actor_id,event_type) VALUES($1,$2,$3,'demo_data_reset')", [randomUUID(), requestId, actorId]);
    await client.query("COMMIT"); return { success: true };
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; } finally { client.release(); }
}
