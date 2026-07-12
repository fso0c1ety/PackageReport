import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";

export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await pool.query(
      `SELECT t.id, t.name, t.columns, r.id AS row_id, r.values
       FROM tables t
       JOIN workspaces w ON w.id = t.workspace_id
       LEFT JOIN rows r ON r.table_id = t.id
       WHERE (w.owner_id = $1 OR COALESCE(t.shared_users, '[]'::jsonb) @> $2::jsonb)
         AND (LOWER(t.name) = 'maintenance' OR LOWER(t.name) = 'trucks')`,
      [String(user.id), JSON.stringify([{ userId: String(user.id) }])]
    );

    const now = new Date();
    const reminders = [];
    for (const record of result.rows) {
      if (!record.row_id) continue;
      const columns = Array.isArray(record.columns) ? record.columns : [];
      const values = record.values || {};
      const nameColumn = [...columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
      const title = String(values[nameColumn?.id] || "Vehicle maintenance");
      const currentKmColumn = columns.find((column) => /current km/i.test(column.name));
      const serviceKmColumn = columns.find((column) => /service km|due km/i.test(column.name));
      if (currentKmColumn && serviceKmColumn) {
        const currentKm = Number(values[currentKmColumn.id]);
        const serviceKm = Number(values[serviceKmColumn.id]);
        if (Number.isFinite(currentKm) && Number.isFinite(serviceKm) && serviceKm - currentKm <= 1000) {
          const kmRemaining = serviceKm - currentKm;
          reminders.push({ id: `${record.row_id}:${serviceKmColumn.id}`, rowId: record.row_id, tableId: record.id, title, type: "Service KM", dueDate: null, daysRemaining: kmRemaining < 0 ? -1 : 7, kmRemaining, severity: kmRemaining < 0 ? "overdue" : "urgent" });
        }
      }
      for (const column of columns.filter((candidate) => candidate.type === "Date" && /due|expiry|insurance|registration|service|oil|tires|tachograph/i.test(candidate.name))) {
        const dueDate = new Date(values[column.id]);
        if (Number.isNaN(dueDate.getTime())) continue;
        const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / DAY_MS);
        if (daysRemaining <= 30) reminders.push({ id: `${record.row_id}:${column.id}`, rowId: record.row_id, tableId: record.id, title, type: column.name, dueDate: dueDate.toISOString(), daysRemaining, severity: daysRemaining < 0 ? "overdue" : daysRemaining <= 7 ? "urgent" : "upcoming" });
      }
    }
    reminders.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return NextResponse.json({ enabled: result.rows.length > 0, count: reminders.length, reminders });
  } catch (error) {
    console.error("[MAINTENANCE REMINDERS]", error);
    return NextResponse.json({ error: "Unable to load maintenance reminders" }, { status: 500 });
  }
}
