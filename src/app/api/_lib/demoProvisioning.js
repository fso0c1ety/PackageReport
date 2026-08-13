import crypto, { randomUUID } from "node:crypto";
import { getWorkspaceTemplateManifest, WORKSPACE_TEMPLATES } from "../../../workspaceTemplates";
import { hashAccountToken, publicAppUrl } from "./accountTokens";
import { sendEmail } from "./mailer";
import { clampDemoDuration, PROSPECT_DEMO_SEED_VERSION, seedProfessionalDemoWorkspace } from "./professionalDemoSeed";
import brand from "../../../../config/brand.json";

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

export async function recordDemoEvent(pool, requestId, actorId, eventType, data = {}) {
  await pool.query("INSERT INTO demo_request_events(id,demo_request_id,actor_id,event_type,data) VALUES($1,$2,$3,$4,$5::jsonb)", [randomUUID(), requestId, actorId || null, eventType, JSON.stringify(data)]);
}

export async function sendDemoAccessEmail({ pool, req, request, eventType = "access_sent", actorId = null }) {
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
    text: `Hi ${request.name},\n\nYour Smart Manage demo workspace is ready.\n\nWe've prepared a workspace based on the needs of ${request.company_name} using the ${templateName} setup.\n\nYour demo includes professional sample workflows so you can explore how Smart Manage can work for your business.\n\n${button}: ${actionUrl}\n\nDemo workspace: ${request.workspace_name}\nAccess available until: ${expiry}\n\nQuestions? ${brand.supportEmail}\n\nSmart Manage\nby Aximo Studio`,
    html: `<div style="background:#f5f3ff;padding:32px 12px;font-family:Arial,sans-serif;color:#11162f"><div style="max-width:560px;margin:auto;background:#fff;border-radius:18px;padding:32px;box-shadow:0 12px 40px rgba(79,70,229,.12)"><div style="font-size:22px;font-weight:800;color:#4f46e5">Smart Manage</div><h2>Your Smart Manage demo is ready</h2><p>Hi ${request.name},</p><p>We've prepared <b>${request.workspace_name}</b> using our ${templateName} workflow.</p><p>Your demo includes professional fictional clients, campaigns, content, tasks, budgets and reporting so you can explore the complete workflow.</p><p style="margin:28px 0"><a href="${actionUrl}" style="display:inline-block;padding:14px 22px;background:#4f46e5;color:white;text-decoration:none;border-radius:9px;font-weight:700">${button}</a></p><p><b>Workspace:</b> ${request.workspace_name}<br/><b>Access available until:</b> ${expiry}</p><p>Questions? <a href="${brand.supportMailto}">${brand.supportEmail}</a></p><hr style="border:0;border-top:1px solid #e5e7eb;margin:28px 0"><p style="color:#667085">Smart Manage<br/>by Aximo Studio</p></div></div>`,
  });
  await pool.query("UPDATE demo_requests SET status='demo_sent',access_email_status='sent',access_email_last_error=NULL,access_email_sent_at=NOW(),updated_at=NOW() WHERE id=$1", [request.id]);
  await recordDemoEvent(pool, request.id, actorId, eventType, { workspaceId: request.demo_workspace_id });
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
      await client.query("INSERT INTO demo_request_events(id,demo_request_id,actor_id,event_type,data) VALUES($1,$2,$3,'demo_approved',$4::jsonb)", [randomUUID(), requestId, actorId, JSON.stringify({ templateKey: selectedTemplate, durationDays: clampDemoDuration(durationDays) })]);
      const existingUser = (await client.query("SELECT id,name,email,password FROM users WHERE LOWER(email)=LOWER($1) FOR UPDATE", [locked.email])).rows[0];
      const prospect = existingUser || (await client.query(`INSERT INTO users(id,name,email,avatar,password,email_verified_at)
        VALUES($1,$2,$3,$4,NULL,NULL) RETURNING id,name,email,password`, [randomUUID(), locked.name, locked.email, avatarFor(locked.name)])).rows[0];
      const template = getWorkspaceTemplateManifest(selectedTemplate);
      const workspaceId = randomUUID();
      const expiresAt = new Date(Date.now() + clampDemoDuration(durationDays) * 86400000);
      const finalName = String(workspaceName || `${locked.company_name} — Demo`).trim().slice(0, 160);
      await client.query(`INSERT INTO workspaces(id,name,owner_id,template_key,is_demo,demo_request_id,demo_expires_at,demo_metadata)
        VALUES($1,$2,$3,$4,TRUE,$5,$6,$7::jsonb)`, [workspaceId, finalName, prospect.id, selectedTemplate, requestId, expiresAt, JSON.stringify({ source: "request_demo", template_key: selectedTemplate, provisioned_by: actorId, provisioned_at: new Date().toISOString(), seed_version: PROSPECT_DEMO_SEED_VERSION })]);
      await client.query(`INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,job_roles,portal_type,landing_route,record_access)
        VALUES($1,$2,'owner','owner','[]'::jsonb,'standard','/dashboard','{"scope":"all_permitted"}'::jsonb)
        ON CONFLICT(workspace_id,user_id) DO NOTHING`, [workspaceId, prospect.id]);
      const seedResult = await seedProfessionalDemoWorkspace({ client, workspaceId, user: prospect, template });
      await client.query(`UPDATE demo_requests SET status='demo_ready',recommended_template=$2,demo_workspace_id=$3,prospect_user_id=$4,
        provisioned_at=NOW(),access_email_status='pending',updated_at=NOW() WHERE id=$1`, [requestId, selectedTemplate, workspaceId, prospect.id]);
      await client.query("INSERT INTO demo_request_events(id,demo_request_id,actor_id,event_type,data) VALUES($1,$2,$3,'demo_provisioned',$4::jsonb)", [randomUUID(), requestId, actorId, JSON.stringify({ workspaceId, templateKey: selectedTemplate, ...seedResult })]);
      await client.query("COMMIT");
      result = { ...locked, id: requestId, recommended_template: selectedTemplate, demo_workspace_id: workspaceId, prospect_user_id: prospect.id, user_password: prospect.password, workspace_name: finalName, demo_expires_at: expiresAt };
    }
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; } finally { client.release(); }
  try { await sendDemoAccessEmail({ pool, req, request: result, actorId }); return { ...result, status: "demo_sent", access_email_status: "sent" }; }
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
    await seedProfessionalDemoWorkspace({ client, workspaceId: request.demo_workspace_id, user, template, reset: true });
    await client.query("INSERT INTO demo_request_events(id,demo_request_id,actor_id,event_type) VALUES($1,$2,$3,'demo_reset')", [randomUUID(), requestId, actorId]);
    await client.query("COMMIT"); return { success: true };
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; } finally { client.release(); }
}
