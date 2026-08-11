import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import bcrypt from "bcryptjs";
import pg from "pg";
import { getWorkspaceTemplateManifest } from "../src/workspaceTemplates.ts";
import { verifyDemoDatabaseTarget } from "./verify-demo-database-target.mjs";

const DEMO_EMAIL = "demo@smartmanage.com";
const SEED_VERSION = 2;
const WORKSPACES = [
  { key: "main", name: "Smart Manage Demo", templateKey: "project_management", counts: { Projects: 7, Tasks: 32, Milestones: 10, "Project Documents": 8, "Project Reports": 7 } },
  { key: "freight", name: "Smart Manage Logistics Demo", templateKey: "freight_broker", counts: { Clients: 8, Carriers: 6, Loads: 14, Invoices: 10, Documents: 12, Tasks: 16, Reports: 6 } },
  { key: "fleet", name: "Smart Manage Fleet Demo", templateKey: "fleet_management", counts: { Trucks: 6, Drivers: 6, Trips: 12, Fuel: 10, Maintenance: 8, Expenses: 10, Documents: 10 } },
  { key: "crm", name: "Smart Manage CRM Demo", templateKey: "crm_sales", counts: { Companies: 18, Contacts: 20, Deals: 12, "Sales Tasks": 16, "CRM Reports": 6 } },
  { key: "daycare", name: "Smart Manage Daycare Demo", templateKey: "kindergarten_nursery", counts: { Children: 16, Parents: 14, Groups: 4, Attendance: 32, Payments: 16, Employees: 6, Meals: 10, Documents: 8 } },
  { key: "dental", name: "Smart Manage Dental Demo", templateKey: "dental_clinic", counts: { Patients: 16, Appointments: 24, Treatments: 18, "Lab Requests": 8, Documents: 8, "Dental Billing": 14, "Dental Inventory": 12 } },
  { key: "construction", name: "Smart Manage Construction Demo", templateKey: "construction", counts: { Projects: 4, "Site Tasks": 24, Materials: 16, Contractors: 8, "Construction Reports": 8 } },
];

const PEOPLE = ["Mira Kelmendi", "Arben Dervishi", "Elira Krasniqi", "Leon Berisha", "Sara Gashi", "Dion Hoxha", "Nora Shala", "Adrian Veliu"];
const PROJECTS = ["Website Redesign", "Mobile Client Portal", "Warehouse Expansion", "Q3 Marketing Campaign", "Customer Onboarding Program", "Operations Automation", "Supplier Integration"];
const COMPANIES = ["Northstar Foods", "Alpine Retail Group", "Vertex Manufacturing", "Bluewave Hotels", "Cedar Health Partners", "Urbanline Construction", "Meridian Trade", "Nova Education Group", "Summit Distribution", "Brightpath Consulting", "Harbor Technologies", "Evergreen Services", "Atlas Components", "Silverline Mobility", "Oakridge Properties", "Cloudbridge Systems", "PrimeWorks Studio", "Westgate Supplies"];
const CHILDREN = ["Lina Hoxha", "Noel Gashi", "Era Berisha", "Dren Kelmendi", "Ana Shala", "Luan Veliu", "Dea Krasniqi", "Jon Dervishi", "Mia Rexha", "Klea Morina", "Rinor Basha", "Elin Zeka", "Ari Pllana", "Nina Bytyqi", "Leo Tahiri", "Ema Leka"];
const PATIENTS = ["Arta Selimi", "Besnik Morina", "Dafina Hoxha", "Erion Gashi", "Flaka Berisha", "Gent Kelmendi", "Hana Shala", "Ilir Veliu", "Jona Krasniqi", "Krenar Dervishi", "Lira Rexha", "Mentor Basha", "Nita Zeka", "Orhan Pllana", "Rina Bytyqi", "Valon Tahiri"];
const ROUTES = ["Munich → Prishtina", "Istanbul → Prishtina", "Milan → Prishtina", "Ljubljana → Prishtina", "Vienna → Prishtina", "Zagreb → Prishtina", "Budapest → Prishtina"];

export function assertDemoPassword(password) {
  if (!password || password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) throw new Error("SMART_MANAGE_DEMO_PASSWORD must be at least 12 characters and include upper-case, lower-case and a number");
}
export function assertWorkspaceMayBeSeeded(workspace) {
  if (!workspace || workspace.is_demo !== true) throw new Error("Refusing to seed a workspace that is not explicitly marked as demo");
}

async function tableHasColumn(client, table, column) {
  const result = await client.query("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2) AS exists", [table, column]);
  return result.rows[0]?.exists === true;
}

async function tableExists(client, table) {
  const result = await client.query("SELECT to_regclass($1) IS NOT NULL AS exists", [`public.${table}`]);
  return result.rows[0]?.exists === true;
}

const boardNames = (board, count) => {
  if (board === "Projects") return PROJECTS.slice(0, count);
  if (board === "Companies" || board === "Clients") return COMPANIES.slice(0, count);
  if (board === "Children") return CHILDREN.slice(0, count);
  if (board === "Patients") return PATIENTS.slice(0, count);
  if (board === "Loads") return Array.from({ length: count }, (_, i) => `LOAD-${String(2401 + i)}`);
  if (board === "Trips") return Array.from({ length: count }, (_, i) => `TRIP-${String(3001 + i)}`);
  if (board === "Drivers") return PEOPLE.slice(0, count);
  if (board === "Trucks") return ["Mercedes Actros 01", "Volvo FH 02", "Scania R 03", "MAN TGX 04", "DAF XF 05", "Iveco S-Way 06"].slice(0, count);
  if (board === "Carriers") return ["TransAlpine Cargo", "Adriatic Freight", "Danube Logistics", "Balkan Route Partners", "Central Europe Haulage", "Orion Transport"].slice(0, count);
  if (board === "Groups") return ["Sunflowers", "Explorers", "Little Stars", "Rainbow Class"].slice(0, count);
  return Array.from({ length: count }, (_, i) => `${board.replace(/s$/, "")} ${String(i + 1).padStart(2, "0")}`);
};

function relationTarget(columnName, boards) {
  const normalized = columnName.toLowerCase();
  return boards.find((board) => {
    const name = board.name.toLowerCase();
    return name === normalized || name.replace(/s$/, "") === normalized.replace(/s$/, "");
  });
}

function professionalValue({ column, boardName, rowIndex, names, relatedRows, boards, userId }) {
  const key = column.name.toLowerCase();
  if (column.name === "Name") return names[rowIndex];
  if (column.type === "Status") return column.options?.[rowIndex % Math.max(1, column.options.length)]?.value || ["Planned", "In Progress", "Completed"][rowIndex % 3];
  if (column.type === "Priority") return ["Medium", "High", "Low", "Urgent"][rowIndex % 4];
  if (column.type === "People") return [{ id: `demo-person-${rowIndex % PEOPLE.length}`, name: PEOPLE[rowIndex % PEOPLE.length], email: `team${(rowIndex % PEOPLE.length) + 1}@smartmanage-demo.com`, ...(rowIndex === 0 ? { linkedUserId: userId } : {}) }];
  if (column.type === "Relation") {
    const target = relationTarget(column.settings?.relationBoard || column.name, boards);
    const rows = target ? relatedRows.get(target.name) || [] : [];
    const row = rows[rowIndex % Math.max(1, rows.length)];
    return row ? [{ tableId: target.id, rowId: row.id, label: row.label, tableName: target.name }] : [];
  }
  if (column.type === "Date") return new Date(Date.UTC(2026, 7 + (rowIndex % 4), 4 + (rowIndex % 24), 8 + (rowIndex % 8))).toISOString();
  if (column.type === "Timeline") return { start: `2026-08-${String(4 + rowIndex % 20).padStart(2, "0")}`, end: `2026-08-${String(8 + rowIndex % 20).padStart(2, "0")}` };
  if (column.type === "Email") return `${boardName.replace(/\W/g, "").toLowerCase()}${rowIndex + 1}@smartmanage-demo.com`;
  if (column.type === "Phone") return `+383 49 800 ${String(100 + rowIndex).padStart(3, "0")}`;
  if (column.type === "Website") return `https://${COMPANIES[rowIndex % COMPANIES.length].replace(/\W/g, "").toLowerCase()}.example`;
  if (column.type === "Location") return ROUTES[rowIndex % ROUTES.length];
  if (column.type === "Money") return 750 + rowIndex * 425;
  if (column.type === "Numbers") return key.includes("year") ? 2022 + rowIndex % 4 : 8 + rowIndex * 3;
  if (column.type === "Progress") return [15, 35, 55, 75, 90, 100][rowIndex % 6];
  if (column.type === "Checkbox") return rowIndex % 3 === 0;
  if (column.type === "Tags") return [["Operations", "Priority"], ["Customer", "Growth"], ["Internal"]][rowIndex % 3];
  if (column.type === "LongText") return key.includes("medical") ? "Confidential demo note with no real patient information." : "Coordinated follow-up with clear ownership and the next milestone confirmed.";
  if (["Files", "Image", "Formula", "Rollup", "CreatedDate", "UpdatedDate", "AutoNumber"].includes(column.type)) return undefined;
  if (key.includes("client")) return COMPANIES[rowIndex % COMPANIES.length];
  if (key.includes("route") || key.includes("pickup") || key.includes("delivery")) return ROUTES[rowIndex % ROUTES.length];
  if (key.includes("procedure")) return ["Preventive care", "Restorative treatment", "Consultation", "Follow-up"][rowIndex % 4];
  if (key.includes("activity")) return ["Planning workshop", "Customer review", "Team coordination", "Progress update"][rowIndex % 4];
  return `${column.name} — ${names[rowIndex]}`;
}

async function assertDemoAccountIsolation(client, userId) {
  const access = await client.query(`SELECT DISTINCT w.id,w.is_demo FROM workspaces w LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$1::text WHERE w.owner_id::text=$1::text OR wm.user_id IS NOT NULL`, [userId]);
  const unsafe = access.rows.find((workspace) => workspace.is_demo !== true);
  if (unsafe) throw new Error(`Demo account isolation violation: access to non-demo workspace ${unsafe.id}`);
}

async function ensureDemoUser(client, password) {
  const existing = await client.query("SELECT id,password FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1", [DEMO_EMAIL]);
  const hasVerifiedAt = await tableHasColumn(client, "users", "email_verified_at");
  const hasUserUpdatedAt = await tableHasColumn(client, "users", "updated_at");
  if (existing.rows[0]) {
    await assertDemoAccountIsolation(client, existing.rows[0].id);
    if (!existing.rows[0].password || !(await bcrypt.compare(password, existing.rows[0].password))) {
      const verifiedUpdate = hasVerifiedAt ? ",email_verified_at=COALESCE(email_verified_at,NOW())" : "";
      const timestampUpdate = hasUserUpdatedAt ? ",updated_at=NOW()" : "";
      await client.query(`UPDATE users SET password=$1${verifiedUpdate}${timestampUpdate} WHERE id=$2`, [await bcrypt.hash(password, 12), existing.rows[0].id]);
    }
    return existing.rows[0].id;
  }
  const id = randomUUID();
  await client.query(hasVerifiedAt
    ? "INSERT INTO users(id,name,email,password,email_verified_at) VALUES($1,'Smart Manage Demo',$2,$3,NOW())"
    : "INSERT INTO users(id,name,email,password) VALUES($1,'Smart Manage Demo',$2,$3)", [id, DEMO_EMAIL, await bcrypt.hash(password, 12)]);
  return id;
}

async function ensureWorkspace(client, userId, config, template) {
  const existing = (await client.query("SELECT * FROM workspaces WHERE owner_id=$1 AND name=$2 LIMIT 1", [userId, config.name])).rows[0];
  if (existing) { assertWorkspaceMayBeSeeded(existing); return existing.id; }
  const id = randomUUID();
  await client.query("INSERT INTO workspaces(id,name,owner_id,template_key,is_demo,demo_expires_at,demo_metadata) VALUES($1,$2,$3,$4,TRUE,NOW()+INTERVAL '180 days',$5::jsonb)", [id, config.name, userId, template.key, JSON.stringify({ purpose: "marketing_screenshots", seedVersion: SEED_VERSION, templateKey: template.key, dataset: config.key })]);
  const hasUniversalMembership = await tableHasColumn(client, "workspace_members", "workspace_role");
  await client.query(hasUniversalMembership
    ? `INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,job_roles,portal_type,landing_route,record_access) VALUES($1,$2,'owner','owner','[]'::jsonb,'standard','/dashboard','{"scope":"all_permitted"}'::jsonb) ON CONFLICT(workspace_id,user_id) DO UPDATE SET workspace_role='owner',role='owner',updated_at=NOW()`
    : "INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,'owner') ON CONFLICT(workspace_id,user_id) DO UPDATE SET role='owner',updated_at=NOW()", [id, userId]);
  return id;
}

async function seedWorkspace(client, workspaceId, userId, config, template) {
  const workspace = (await client.query("SELECT id,is_demo,demo_metadata FROM workspaces WHERE id=$1 FOR UPDATE", [workspaceId])).rows[0];
  assertWorkspaceMayBeSeeded(workspace);
  if (Number(workspace.demo_metadata?.seedVersion) === SEED_VERSION) {
    const existingBoards = (await client.query("SELECT id,name FROM tables WHERE workspace_id=$1", [workspaceId])).rows;
    if (existingBoards.length === template.boards.length) return existingBoards;
  }
  await client.query("DELETE FROM tables WHERE workspace_id=$1", [workspaceId]);
  const boards = [];
  for (const board of template.boards) {
    const id = randomUUID();
    const columns = board.columns.map((column, order) => ({ ...column, id: randomUUID(), order }));
    await client.query("INSERT INTO tables(id,name,workspace_id,columns) VALUES($1,$2,$3,$4::jsonb)", [id, board.name, workspaceId, JSON.stringify(columns)]);
    boards.push({ id, name: board.name, columns });
  }
  const relatedRows = new Map();
  for (const board of boards) {
    const count = config.counts[board.name] || 5;
    const names = boardNames(board.name, count);
    const rows = names.map((label) => ({ id: randomUUID(), label }));
    relatedRows.set(board.name, rows);
    for (const row of rows) await client.query("INSERT INTO rows(id,table_id,values,created_by) VALUES($1,$2,'{}'::jsonb,$3)", [row.id, board.id, userId]);
  }
  for (const board of boards) {
    const rows = relatedRows.get(board.name);
    const names = rows.map((row) => row.label);
    for (let index = 0; index < rows.length; index += 1) {
      const values = {};
      for (const column of board.columns) {
        const value = professionalValue({ column, boardName: board.name, rowIndex: index, names, relatedRows, boards, userId });
        if (value !== undefined) values[column.id] = value;
      }
      if (config.templateKey === "fleet_management" && board.name === "Drivers") {
        values._driverProfileId = rows[index].id;
        if (index === 0) values._linkedUserId = String(userId);
      }
      if (config.templateKey === "fleet_management" && board.name === "Trips") {
        const driver = relatedRows.get("Drivers")?.[index % (relatedRows.get("Drivers")?.length || 1)];
        values._workspaceId = workspaceId;
        values._assignedDriverProfileId = driver?.id || null;
        if (index === 0) values._assignedDriverUserId = String(userId);
      }
      await client.query("UPDATE rows SET values=$1::jsonb WHERE id=$2", [JSON.stringify(values), rows[index].id]);
    }
  }
  if (await tableExists(client, "board_views")) {
    for (const view of template.views || []) {
      const board = boards.find((item) => item.name === view.boardName);
      if (board) await client.query("INSERT INTO board_views(id,table_id,owner_id,name,type,visibility,config,is_default) VALUES($1,$2,$3,$4,$5,'workspace',$6::jsonb,$7)", [randomUUID(), board.id, userId, view.name, view.type, JSON.stringify(view.config || {}), Boolean(view.isDefault)]);
    }
  }
  if (await tableExists(client, "dashboards") && await tableExists(client, "dashboard_widgets")) {
    for (const dashboard of template.dashboards || []) {
      const dashboardId = randomUUID();
      await client.query("INSERT INTO dashboards(id,workspace_id,owner_id,name,description,layout,settings) VALUES($1,$2,$3,$4,$5,'[]'::jsonb,$6::jsonb)", [dashboardId, workspaceId, userId, dashboard.name, template.description, JSON.stringify({ demo: true, templateKey: template.key })]);
      for (const [index, widget] of (dashboard.widgets || []).entries()) await client.query("INSERT INTO dashboard_widgets(id,dashboard_id,type,title,config,position) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb)", [randomUUID(), dashboardId, widget.type, widget.title || widget.type, JSON.stringify(widget), JSON.stringify({ index, size: "medium" })]);
    }
  }
  await client.query("UPDATE workspaces SET demo_metadata=$1::jsonb WHERE id=$2", [JSON.stringify({ purpose: "marketing_screenshots", seedVersion: SEED_VERSION, templateKey: template.key, dataset: config.key, fictionalDataOnly: true }), workspaceId]);
  return boards;
}

async function validateQuality(client, workspaceId, config) {
  const counts = await client.query("SELECT t.name,COUNT(r.id)::int AS count FROM tables t LEFT JOIN rows r ON r.table_id=t.id WHERE t.workspace_id=$1 GROUP BY t.id,t.name", [workspaceId]);
  const byBoard = Object.fromEntries(counts.rows.map((row) => [row.name, row.count]));
  for (const [board, minimum] of Object.entries(config.counts)) if ((byBoard[board] || 0) < minimum) throw new Error(`${config.name} quality check failed: ${board} requires ${minimum} rows; observed ${JSON.stringify(byBoard)}`);
  if (await tableExists(client, "dashboards") && await tableExists(client, "dashboard_widgets")) {
    const dashboards = await client.query("SELECT COUNT(dw.id)::int count FROM dashboards d JOIN dashboard_widgets dw ON dw.dashboard_id=d.id WHERE d.workspace_id=$1", [workspaceId]);
    if (dashboards.rows[0].count < 1) throw new Error(`${config.name} quality check failed: dashboard widgets are empty`);
  }
  const brokenRelations = await client.query(`SELECT COUNT(*)::int count FROM rows r JOIN tables t ON t.id=r.table_id
    CROSS JOIN LATERAL jsonb_each(r.values) cell
    CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(cell.value)='array' THEN cell.value ELSE '[]'::jsonb END) relation
    WHERE t.workspace_id=$1 AND relation ? 'rowId' AND NOT EXISTS(SELECT 1 FROM rows target WHERE target.id=relation->>'rowId')`, [workspaceId]);
  if (brokenRelations.rows[0].count > 0) throw new Error(`${config.name} quality check failed: broken relations detected`);
  if (config.templateKey === "fleet_management") {
    const assignedTrips = await client.query(`SELECT COUNT(*)::int count FROM rows r JOIN tables t ON t.id=r.table_id WHERE t.workspace_id=$1 AND LOWER(t.name)='trips' AND r.values->>'_assignedDriverUserId' IS NOT NULL`, [workspaceId]);
    if (assignedTrips.rows[0].count < 1) throw new Error(`${config.name} quality check failed: Driver Portal has no assigned trip`);
  }
  return byBoard;
}

export async function seedMarketingDemo({ connectionString = process.env.DATABASE_URL, password = process.env.SMART_MANAGE_DEMO_PASSWORD, env = process.env } = {}) {
  assertDemoPassword(password);
  const database = await verifyDemoDatabaseTarget({ connectionString, env });
  if (!database.migration027Applied) throw new Error("Migration 027_demo_requests_and_demo_workspaces.sql must be applied first");
  const pool = new pg.Pool({ connectionString, ssl: env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userId = await ensureDemoUser(client, password);
    const manifestWorkspaces = {};
    for (const config of WORKSPACES) {
      const template = getWorkspaceTemplateManifest(config.templateKey);
      const workspaceId = await ensureWorkspace(client, userId, config, template);
      const boards = await seedWorkspace(client, workspaceId, userId, config, template);
      const counts = await validateQuality(client, workspaceId, config);
      manifestWorkspaces[config.key] = { workspaceId, dashboardRoute: `/dashboard/?workspaceId=${workspaceId}`, workspaceRoute: `/workspace/?id=${workspaceId}`, tableIds: Object.fromEntries(boards.map((board) => [board.name, board.id])), rowCounts: counts };
    }
    await assertDemoAccountIsolation(client, userId);
    const allDemo = await client.query("SELECT COUNT(*)::int total,COUNT(*) FILTER(WHERE is_demo=TRUE)::int demo FROM workspaces WHERE owner_id=$1", [userId]);
    if (allDemo.rows[0].total !== allDemo.rows[0].demo) throw new Error("Demo isolation validation failed");
    await client.query("COMMIT");
    const manifest = { generatedAt: new Date().toISOString(), demoUserEmail: DEMO_EMAIL, databaseFingerprint: database.fingerprint, workspaces: manifestWorkspaces };
    await writeFile(path.join(path.dirname(fileURLToPath(import.meta.url)), ".marketing-demo-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    return manifest;
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
  finally { client.release(); await pool.end(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) seedMarketingDemo().then((manifest) => console.log(`Marketing demo ready: ${Object.keys(manifest.workspaces).length} isolated workspaces`)).catch((error) => { console.error(`Marketing demo seed failed: ${error.message}`); process.exitCode = 1; });
