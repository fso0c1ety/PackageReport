import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";
import { WORKSPACE_TEMPLATES } from "../../../workspaceTemplates";

export const runtime = "nodejs";

async function ensureMarketplaceTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS marketplace_templates (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
    category TEXT NOT NULL, template_key TEXT NOT NULL, author_id TEXT NOT NULL,
    downloads INTEGER NOT NULL DEFAULT 0, featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS marketplace_reviews (
    id TEXT PRIMARY KEY, template_id TEXT NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(template_id, user_id)
  )`);
}

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureMarketplaceTables();
    const { rows } = await pool.query(`SELECT mt.*, u.name AS author_name,
      COALESCE(AVG(mr.rating), 0)::float AS rating, COUNT(mr.id)::int AS review_count
      FROM marketplace_templates mt LEFT JOIN users u ON u.id=mt.author_id
      LEFT JOIN marketplace_reviews mr ON mr.template_id=mt.id
      GROUP BY mt.id,u.name ORDER BY mt.featured DESC,mt.downloads DESC,mt.created_at DESC`);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("[MARKETPLACE][GET]", error);
    return NextResponse.json({ error: "Unable to load marketplace" }, { status: 500 });
  }
}

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureMarketplaceTables();
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const description = String(body?.description || "").trim();
    const category = String(body?.category || "General").trim();
    const templateKey = String(body?.templateKey || "blank");
    if (!name || !description) return NextResponse.json({ error: "Name and description are required" }, { status: 400 });
    if (!WORKSPACE_TEMPLATES.some((item) => item.key === templateKey)) return NextResponse.json({ error: "Invalid base template" }, { status: 400 });
    const id = randomUUID();
    const { rows } = await pool.query(`INSERT INTO marketplace_templates
      (id,name,description,category,template_key,author_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, name.slice(0, 100), description.slice(0, 500), category.slice(0, 60), templateKey, user.id]);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("[MARKETPLACE][POST]", error);
    return NextResponse.json({ error: "Unable to publish template" }, { status: 500 });
  }
}
