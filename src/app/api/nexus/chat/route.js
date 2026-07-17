import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import aiContext from "../../../../../server/services/aiContextEngine.cjs";

export const runtime = "nodejs";

async function ensureAiSchema() {
  await pool.query(`
    ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT TRUE;
    CREATE TABLE IF NOT EXISTS ai_action_logs (
      id TEXT PRIMARY KEY,user_id TEXT NOT NULL,workspace_id TEXT NOT NULL,table_id TEXT,
      capability TEXT NOT NULL,input_summary TEXT,status TEXT NOT NULL DEFAULT 'success',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ai_action_logs_workspace_created_idx ON ai_action_logs(workspace_id,created_at DESC)
  `);
}

function buildFallbackCompletion(payload) {
  return {
    id: "nexus-fallback",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "nexus-fallback",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: JSON.stringify(payload),
        },
        finish_reason: "stop",
      },
    ],
  };
}

function buildGracefulPayload(input = "") {
  if (/invoice/i.test(input)) {
    return {
      response: "Nexus Brain is temporarily unavailable, so the app will prepare a draft from your selected tasks instead.",
      invoiceDraft: {
        assumptions: ["AI invoice enrichment is temporarily unavailable; local draft fallback is being used."],
        items: [],
      },
    };
  }

  return {
    thought: "Nexus Brain fallback response",
    action: "none",
    params: {},
    response:
      "Nexus Brain is temporarily unavailable. You can still continue using the board and try again shortly.",
  };
}

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let input = "";

  try {
    await ensureAiSchema();
    const body = await req.json();
    input = body?.input || "";
    const workspaceId = String(body?.workspaceId || "");
    const capability = aiContext.normalizeCapability(body?.capability);
    if (!workspaceId) return NextResponse.json({ error: "Workspace context is required" }, { status: 400 });
    const access = await pool.query("SELECT * FROM workspaces WHERE id=$1 AND (owner_id=$2 OR EXISTS(SELECT 1 FROM tables t WHERE t.workspace_id=$1 AND COALESCE(t.shared_users,'[]'::jsonb) @> $3::jsonb))", [workspaceId, String(user.id), JSON.stringify([{ userId: String(user.id) }])]);
    if (!access.rows[0]) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (access.rows[0].ai_enabled === false) return NextResponse.json({ error: "AI is disabled for this workspace" }, { status: 403 });
    const tablesResult = await pool.query("SELECT id,name,columns,doc_content FROM tables WHERE workspace_id=$1 AND (EXISTS(SELECT 1 FROM workspaces w WHERE w.id=$1 AND w.owner_id=$2) OR COALESCE(shared_users,'[]'::jsonb) @> $3::jsonb)", [workspaceId, String(user.id), JSON.stringify([{ userId: String(user.id) }])]);
    const tableIds = tablesResult.rows.map((table) => String(table.id));
    const rowsResult = tableIds.length ? await pool.query("SELECT id,table_id,values FROM rows WHERE table_id=ANY($1) AND archived_at IS NULL ORDER BY updated_at DESC NULLS LAST,created_at DESC LIMIT 100", [tableIds]) : { rows: [] };
    const context = aiContext.buildWorkspaceContext({ workspace: access.rows[0], tables: tablesResult.rows, rows: rowsResult.rows });
    const contextText = JSON.stringify(context).slice(0, 50000);
    const systemPrompt = `${body?.systemPrompt || "You are Nexus Brain."}\nCapability: ${capability}. Use only the authorized workspace context below. Never reveal another workspace or claim a write occurred.\nWORKSPACE_CONTEXT:${contextText}`;
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

    if (!apiKey) {
      console.warn("[NEXUS][POST] Missing OPENAI_API_KEY, using graceful fallback.");
      const insight = aiContext.buildDeterministicInsight(capability, context);
      await pool.query("INSERT INTO ai_action_logs(id,user_id,workspace_id,capability,input_summary,status,metadata) VALUES($1,$2,$3,$4,$5,'fallback',$6::jsonb)", [randomUUID(), String(user.id), workspaceId, capability, input.slice(0,500), JSON.stringify({ boardCount: context.boards.length, rowCount: context.rows.length })]);
      return NextResponse.json(buildFallbackCompletion(insight));
    }

    const candidateModels = Array.from(
      new Set([process.env.OPENAI_MODEL, "gpt-4o-mini", "gpt-4o"].filter(Boolean))
    );

    let lastErrorMessage = "OpenAI Request Failed";

    for (const model of candidateModels) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            { role: "user", content: input },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await pool.query("INSERT INTO ai_action_logs(id,user_id,workspace_id,capability,input_summary,status,metadata) VALUES($1,$2,$3,$4,$5,'success',$6::jsonb)", [randomUUID(), String(user.id), workspaceId, capability, input.slice(0,500), JSON.stringify({ boardCount: context.boards.length, rowCount: context.rows.length })]);
        return NextResponse.json(data);
      }

      try {
        const errorData = await response.json();
        lastErrorMessage = errorData?.error?.message || lastErrorMessage;
      } catch {
        const errorText = await response.text();
        if (errorText) {
          lastErrorMessage = errorText.slice(0, 500);
        }
      }

      console.warn(`[NEXUS][POST] Model ${model} failed: ${lastErrorMessage}`);
    }

    console.warn(`[NEXUS][POST] Upstream AI unavailable, using fallback: ${lastErrorMessage}`);
    return NextResponse.json(buildFallbackCompletion(buildGracefulPayload(input)));
  } catch (err) {
    console.error("[NEXUS][POST] Error:", err);
    return NextResponse.json(buildFallbackCompletion(buildGracefulPayload(input)));
  }
}
