import { randomUUID } from "node:crypto";

export const PROSPECT_DEMO_SEED_VERSION = 2;
export const MARKETING_DEMO_COUNTS = Object.freeze({ Clients: 10, Campaigns: 12, Content: 20, Tasks: 32, Budgets: 10, Reports: 8 });
export const MARKETING_DEMO_STATUSES = Object.freeze(["Planning", "In Progress", "Waiting for Client", "Review", "Scheduled", "Completed", "On Hold"]);

const names = {
  Clients: ["Northstar Foods", "Alpine Retail Group", "Vertex Manufacturing", "Bluewave Hotels", "Cedar Health Partners", "Urbanline Construction", "Meridian Travel", "Nova Education Group", "Summit Distribution", "Brightpath Consulting"],
  Campaigns: ["Spring Brand Launch", "Retail Growth Sprint", "Factory Storytelling", "Summer Escape", "Wellness Awareness", "Urban Living", "Destination Discovery", "Enrollment Season", "Partner Network", "Expert Insights", "Autumn Acquisition", "Year-End Retention"],
  Content: ["Brand story carousel", "Product launch reel", "Customer success article", "Behind the scenes video", "Destination email series", "Leadership interview", "Seasonal landing page", "Community spotlight", "Campaign performance recap", "Service explainer", "Client testimonial", "Monthly newsletter", "SEO pillar article", "Paid social creative", "Event invitation", "Case study", "Short-form video", "Website hero copy", "Partner announcement", "Quarterly insights report"],
  Tasks: ["Approve creative direction", "Review campaign brief", "Prepare audience segments", "Finalize media plan", "Draft landing page", "Schedule social content", "Quality-check tracking", "Publish launch assets", "Review weekly performance", "Prepare client update", "Optimize paid campaign", "Edit brand video", "Complete keyword research", "Write campaign copy", "Design email template", "Configure conversion events", "Prepare monthly report", "Review content calendar", "Collect stakeholder feedback", "Finalize photography list", "Create remarketing audience", "Audit website metadata", "Update campaign budget", "Prepare presentation", "Confirm publication dates", "Review accessibility", "Export performance data", "Coordinate launch day", "Draft case study", "Archive approved assets", "Plan next sprint", "Send executive summary"],
  Budgets: ["Northstar media budget", "Alpine launch budget", "Vertex content budget", "Bluewave seasonal budget", "Cedar awareness budget", "Urbanline project budget", "Meridian acquisition budget", "Nova enrollment budget", "Summit partner budget", "Brightpath thought leadership budget"],
  Reports: ["January performance review", "February channel report", "Q1 executive summary", "Campaign conversion analysis", "Content engagement review", "Paid media efficiency report", "SEO visibility report", "Client portfolio overview"],
};
const fictionalTeam = ["Mira Stone", "Elena Brooks", "Noah Bennett", "Sofia Marin", "Lucas Meyer", "Amelia Carter", "Theo Laurent", "Nora Klein"];

export function professionalDemoCount(boardName) { return MARKETING_DEMO_COUNTS[boardName] || 6; }
export function clampDemoDuration(value) { return Math.max(1, Math.min(90, Number(value) || 7)); }

function valueFor(column, boardName, index, relations, user) {
  const relationBoard = column.settings?.relationBoard || column.name;
  if (column.type === "Relation") {
    const candidates = relations.get(relationBoard) || [];
    const target = candidates[index % Math.max(candidates.length, 1)];
    return target ? [{ tableId: target.tableId, rowId: target.rowId, label: target.label, tableName: relationBoard }] : [];
  }
  if (column.type === "People") return [{ id: String(user.id), name: fictionalTeam[index % fictionalTeam.length], email: user.email }];
  if (column.type === "Status") return MARKETING_DEMO_STATUSES[index % MARKETING_DEMO_STATUSES.length];
  if (column.type === "Date") return new Date(Date.UTC(2026, 7 + (index % 4), 3 + (index % 24))).toISOString();
  if (column.type === "Money") return column.name === "Cost" ? 900 + index * 175 : 2400 + index * 325;
  if (["Numbers", "Progress"].includes(column.type)) return 10 + index * 7;
  if (column.type === "Checkbox") return index % 2 === 0;
  if (column.type === "Timeline") return { start: "2026-08-03", end: "2026-08-17" };
  if (column.type === "Email") return `contact${index + 1}@fictional-brand.demo`;
  if (column.type === "Phone") return `+44 20 7000 ${String(1100 + index).padStart(4, "0")}`;
  if (column.type === "Location") return ["London, United Kingdom", "Amsterdam, Netherlands", "Vienna, Austria"][index % 3];
  if (["Files", "Formula", "CreatedDate", "UpdatedDate", "AutoNumber"].includes(column.type)) return undefined;
  return `${boardName} workflow brief ${index + 1}`;
}

export async function seedProfessionalDemoWorkspace({ client, workspaceId, user, template, reset = false }) {
  const workspace = (await client.query("SELECT id,is_demo FROM workspaces WHERE id=$1 FOR UPDATE", [workspaceId])).rows[0];
  if (!workspace?.is_demo) throw new Error("Professional demo seed refused: target workspace is not a demo");
  const existing = (await client.query("SELECT id,name,columns FROM tables WHERE workspace_id=$1", [workspaceId])).rows;
  const tables = new Map();
  for (const board of template.boards) {
    let table = existing.find((item) => item.name === board.name);
    if (!table) {
      const columns = board.columns.map((column, order) => ({ ...column, id: randomUUID(), order }));
      table = { id: randomUUID(), name: board.name, columns };
      await client.query("INSERT INTO tables(id,name,workspace_id,columns,created_at) VALUES($1,$2,$3,$4,$5)", [table.id, table.name, workspaceId, JSON.stringify(columns), Date.now()]);
    } else if (reset) await client.query("DELETE FROM rows WHERE table_id=$1", [table.id]);
    tables.set(board.name, table);
  }
  const relations = new Map();
  for (const board of template.boards) {
    const table = tables.get(board.name); const count = professionalDemoCount(board.name); const rows = [];
    for (let index = 0; index < count; index += 1) {
      const rowId = randomUUID(); const label = names[board.name]?.[index] || `${board.name.replace(/s$/, "")} Workflow ${index + 1}`;
      rows.push({ tableId: table.id, rowId, label });
      await client.query("INSERT INTO rows(id,table_id,values,created_by,created_at) VALUES($1,$2,'{}'::jsonb,$3,NOW())", [rowId, table.id, user.id]);
    }
    relations.set(board.name, rows);
  }
  for (const board of template.boards) {
    const table = tables.get(board.name); const rows = relations.get(board.name) || [];
    for (let index = 0; index < rows.length; index += 1) {
      const values = {};
      for (const column of table.columns || []) {
        const value = column.name === "Name" ? rows[index].label : valueFor(column, board.name, index, relations, user);
        if (value !== undefined) values[column.id] = value;
      }
      await client.query("UPDATE rows SET values=$1::jsonb WHERE id=$2", [JSON.stringify(values), rows[index].rowId]);
    }
  }
  if (!reset) {
    const available = (await client.query("SELECT to_regclass('public.board_views') AS views,to_regclass('public.dashboards') AS dashboards,to_regclass('public.dashboard_widgets') AS widgets")).rows[0] || {};
    if (available.views) for (const view of template.views || []) {
      const table = tables.get(view.boardName); if (!table) continue;
      await client.query("INSERT INTO board_views(id,table_id,owner_id,name,type,visibility,config,is_default) VALUES($1,$2,$3,$4,$5,'workspace',$6,$7)", [randomUUID(), table.id, user.id, view.name, view.type, JSON.stringify({ templateId: template.id, ...(view.config || {}) }), Boolean(view.isDefault)]);
    }
    if (available.dashboards) for (const dashboard of template.dashboards || []) {
      const dashboardId = randomUUID();
      await client.query("INSERT INTO dashboards(id,workspace_id,owner_id,name,description,layout,settings) VALUES($1,$2,$3,$4,$5,$6,$7)", [dashboardId, workspaceId, user.id, dashboard.name, template.description, JSON.stringify([]), JSON.stringify({ templateId: template.id })]);
      if (available.widgets) for (const [position, widget] of dashboard.widgets.entries()) {
        const source = tables.get(widget.sourceBoard || template.boards[0]?.name); const sourceColumn = source?.columns?.find((column) => column.name === widget.sourceColumn);
        await client.query("INSERT INTO dashboard_widgets(id,dashboard_id,type,title,config,position) VALUES($1,$2,$3,$4,$5,$6)", [randomUUID(), dashboardId, widget.type, String(widget.title || widget.type), JSON.stringify({ ...widget, sourceTableId: source?.id || null, columnId: sourceColumn?.id || null }), JSON.stringify({ index: position, size: "medium" })]);
      }
    }
  }
  return { rowCounts: Object.fromEntries([...relations].map(([name, rows]) => [name, rows.length])), seedVersion: PROSPECT_DEMO_SEED_VERSION };
}
