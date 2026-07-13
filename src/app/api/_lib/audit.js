import { randomUUID } from "node:crypto";
import { pool } from "./server";

let auditSchemaPromise;

export function ensureEnterpriseAuditSchema() {
  if (!auditSchemaPromise) {
    auditSchemaPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS enterprise_audit_logs (
        id TEXT PRIMARY KEY,
        actor_id TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        table_id TEXT,
        workspace_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_enterprise_audit_actor ON enterprise_audit_logs(actor_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_enterprise_audit_table ON enterprise_audit_logs(table_id, created_at DESC);
    `).catch((error) => {
      auditSchemaPromise = undefined;
      throw error;
    });
  }
  return auditSchemaPromise;
}

export async function writeAuditLog({ actorId, action, entityType, entityId = null, tableId = null, workspaceId = null, metadata = {} }) {
  await ensureEnterpriseAuditSchema();
  await pool.query(
    `INSERT INTO enterprise_audit_logs
      (id, actor_id, action, entity_type, entity_id, table_id, workspace_id, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [randomUUID(), String(actorId), action, entityType, entityId, tableId, workspaceId, JSON.stringify(metadata)]
  );
}
