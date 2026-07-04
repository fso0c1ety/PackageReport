import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthenticatedUser, pool } from "../../_lib/server";

export const runtime = "nodejs";

function mapAutomationRow(row) {
  return {
    id: row.id,
    tableId: row.table_id,
    taskIds: row.task_ids || (row.task_id ? [row.task_id] : []),
    triggerCol: row.trigger_col,
    enabled: row.enabled,
    recipients: row.recipients,
    cols: row.cols,
    actionType: row.action_type || "email",
    rules: Array.isArray(row.conditions) ? row.conditions : [],
  };
}

function validateAutomationPayload({ triggerCol, recipients, cols }) {
  if (!triggerCol) {
    return "Trigger column is required";
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return "At least one recipient email is required";
  }
  if (!Array.isArray(cols) || cols.length === 0) {
    return "At least one board column must be included in the email";
  }
  return null;
}

async function getAutomationIdType() {
  const schema = await pool.query(`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'automations'
      AND column_name = 'id'
    LIMIT 1
  `);
  return schema.rows[0]?.data_type || "text";
}

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;

    const result = await pool.query(
      "SELECT * FROM automations WHERE table_id = $1 ORDER BY id DESC",
      [tableId]
    );

    return NextResponse.json(result.rows.map(mapAutomationRow));
  } catch (err) {
    console.error("[AUTOMATION/:tableId][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;
    const body = await req.json();
    const { id, triggerCol, cols, recipients, enabled, taskIds, actionType, rules } = body || {};
    const normalizedRules = Array.isArray(rules)
      ? rules.filter((rule) => rule?.value && ["email", "notification", "both"].includes(rule?.actionType))
      : [];
    const validationError = validateAutomationPayload({ triggerCol, recipients, cols });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (id) {
      await pool.query(
        `
          UPDATE automations
          SET trigger_col = $1,
              enabled = $2,
              recipients = $3,
              cols = $4,
              action_type = $5,
              task_ids = $6,
              conditions = $7,
              actions = $8,
              updated_at = NOW()
          WHERE id = $9 AND table_id = $10
        `,
        [
          triggerCol,
          enabled,
          recipients || [],
          cols || [],
          actionType || "email",
          taskIds || [],
          JSON.stringify(normalizedRules),
          JSON.stringify(normalizedRules.map(({ value, actionType: type }) => ({ value, type }))),
          id,
          tableId,
        ]
      );
    } else {
      const values = [
        tableId,
        taskIds || [],
        triggerCol,
        enabled,
        recipients || [],
        cols || [],
        actionType || "email",
        JSON.stringify(normalizedRules),
        JSON.stringify(normalizedRules.map(({ value, actionType: type }) => ({ value, type }))),
        user.id,
      ];
      const idType = await getAutomationIdType();

      // Older installations use SERIAL ids while fresh installations use TEXT ids.
      // Let PostgreSQL generate a SERIAL id instead of attempting to insert a UUID into it.
      if (["smallint", "integer", "bigint"].includes(idType)) {
        await pool.query(
          `INSERT INTO automations
             (table_id, task_ids, trigger_col, enabled, recipients, cols, action_type, conditions, actions, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          values
        );
      } else {
        await pool.query(
          `INSERT INTO automations
             (id, table_id, task_ids, trigger_col, enabled, recipients, cols, action_type, conditions, actions, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [randomUUID(), ...values]
        );
      }
    }

    const result = await pool.query(
      "SELECT * FROM automations WHERE table_id = $1 ORDER BY id DESC",
      [tableId]
    );

    return NextResponse.json(result.rows.map(mapAutomationRow));
  } catch (err) {
    console.error("[AUTOMATION/:tableId][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
