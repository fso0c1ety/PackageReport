import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAuthenticatedUser, pool } from "../_lib/server";
import { requireWritableSubscription } from "../_lib/billing";
import { getWorkspaceTemplateManifest } from "../../../workspaceTemplates";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `
        SELECT DISTINCT 
          w.*, 
          u.name as owner_name, 
          u.avatar as owner_avatar,
          COALESCE(
            (
              SELECT jsonb_agg(jsonb_build_object('id', um.id, 'name', um.name, 'avatar', um.avatar))
              FROM (
                  SELECT DISTINCT (elem->>'userId') as uid
                  FROM tables t2, jsonb_array_elements(t2.shared_users) elem
                  WHERE t2.workspace_id = w.id
              ) distinct_users
              JOIN users um ON um.id = distinct_users.uid
              WHERE um.id != w.owner_id
            ), 
            '[]'::jsonb
          ) as members
        FROM workspaces w
        JOIN users u ON w.owner_id = u.id
        LEFT JOIN tables t ON w.id = t.workspace_id
        WHERE w.owner_id = $1 OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(t.shared_users) AS elem
          WHERE elem->>'userId' = $1
        )
      `,
      [user.id]
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("[WORKSPACES][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const billingError = await requireWritableSubscription(user.id);
  if (billingError) return billingError;

  try {
    const body = await req.json();
    const template = getWorkspaceTemplateManifest(body?.templateKey);
    const includeSampleData = body?.includeSampleData !== false;
    const newWorkspace = {
      id: uuidv4(),
      name: body?.name || "Untitled Workspace",
      owner_id: user.id,
    };

    const client = await pool.connect();
    const createdBoards = [];
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO workspaces (id, name, owner_id) VALUES ($1, $2, $3)", [newWorkspace.id, newWorkspace.name, newWorkspace.owner_id]);
      for (const board of template.boards) {
        const tableId = uuidv4();
        const columns = board.columns.map((column, order) => ({ ...column, id: uuidv4(), order }));
        await client.query("INSERT INTO tables (id, name, workspace_id, columns, created_at) VALUES ($1,$2,$3,$4,$5)", [tableId, board.name, newWorkspace.id, JSON.stringify(columns), Date.now()]);
        for (const seedRow of includeSampleData ? (board.rows || []) : []) {
          const values = {};
          for (const column of columns) if (Object.prototype.hasOwnProperty.call(seedRow, column.name)) values[column.id] = seedRow[column.name];
          await client.query("INSERT INTO rows(id,table_id,values,created_by,created_at) VALUES($1,$2,$3,$4,NOW())", [uuidv4(), tableId, JSON.stringify(values), user.id]);
        }
        createdBoards.push({ id: tableId, name: board.name });
      }
      const relationState = await client.query("SELECT to_regclass('public.board_views') AS views, to_regclass('public.dashboards') AS dashboards, to_regclass('public.dashboard_widgets') AS widgets, to_regclass('public.workspace_modules') AS modules");
      const available = relationState.rows[0] || {};
      if (available.views) for (const view of template.views) {
        const target = createdBoards.find((board) => board.name === view.boardName);
        if (target) await client.query("INSERT INTO board_views(id,table_id,owner_id,name,type,visibility,config,is_default) VALUES($1,$2,$3,$4,$5,'workspace',$6,$7)", [uuidv4(), target.id, user.id, view.name, view.type, JSON.stringify({ templateId: template.id }), Boolean(view.isDefault)]);
      }
      if (available.dashboards) for (const dashboard of template.dashboards) {
        const dashboardId = uuidv4();
        await client.query("INSERT INTO dashboards(id,workspace_id,owner_id,name,description,layout,settings) VALUES($1,$2,$3,$4,$5,$6,$7)", [dashboardId, newWorkspace.id, user.id, dashboard.name, template.description, JSON.stringify([]), JSON.stringify({ templateId: template.id })]);
        if (available.widgets) for (const [position, widget] of dashboard.widgets.entries()) await client.query("INSERT INTO dashboard_widgets(id,dashboard_id,type,title,config,position) VALUES($1,$2,$3,$4,$5,$6)", [uuidv4(), dashboardId, widget.type, String(widget.title || widget.type), JSON.stringify(widget), JSON.stringify({ index: position, size: 'medium' })]);
      }
      if (available.modules) {
        const moduleColumns = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_modules'");
        const moduleColumnNames = new Set(moduleColumns.rows.map((row) => row.column_name));
        if (moduleColumnNames.has("module_key")) {
          for (const moduleKey of template.modules) await client.query("INSERT INTO workspace_modules(workspace_id,module_key,enabled,settings) VALUES($1,$2,TRUE,$3) ON CONFLICT(workspace_id,module_key) DO UPDATE SET enabled=TRUE,settings=EXCLUDED.settings,updated_at=NOW()", [newWorkspace.id, moduleKey, JSON.stringify({ source: "template", templateId: template.id })]);
        } else if (moduleColumnNames.has("modules")) {
          await client.query("INSERT INTO workspace_modules(workspace_id,modules,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(workspace_id) DO UPDATE SET modules=EXCLUDED.modules,updated_at=NOW()", [newWorkspace.id, JSON.stringify(template.modules)]);
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return NextResponse.json({ ...newWorkspace, templateKey: template.key, boards: createdBoards, modules: template.modules, sampleDataIncluded: includeSampleData });
  } catch (err) {
    console.error("[WORKSPACES][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
