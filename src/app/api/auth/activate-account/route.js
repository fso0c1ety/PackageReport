import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "../../_lib/server";
import { hashAccountToken } from "../../_lib/accountTokens";

export const runtime = "nodejs";

export async function POST(req) {
  const { token } = await req.json().catch(() => ({}));
  if (!token) return NextResponse.json({ error: "Activation token is required" }, { status: 400 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT * FROM account_activation_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW() FOR UPDATE`,
      [hashAccountToken(token)]
    );
    const activation = result.rows[0];
    if (!activation) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Activation link is invalid or has expired" }, { status: 400 });
    }
    const p = activation.pending_profile || {};
    const updated = await client.query(
      `UPDATE users SET name=$1,password=$2,avatar=$3,first_name=$4,last_name=$5,phone=$6,
       job_title=$7,company=$8,birth_date=$9,gender=$10,email_verified_at=NOW()
       WHERE id=$11 AND password IS NULL RETURNING id`,
      [p.name,p.passwordHash,p.avatar,p.firstName,p.lastName,p.phone||"",p.jobTitle||"",p.company||"",p.birthDate||null,p.gender||null,activation.user_id]
    );
    if (!updated.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Account is already active" }, { status: 409 });
    }
    await client.query("UPDATE account_activation_tokens SET used_at=NOW() WHERE id=$1", [activation.id]);
    await client.query(
      `INSERT INTO authentication_audit_events (id,user_id,event_type,ip_address,user_agent)
       VALUES ($1,$2,'legacy_account_activated',$3,$4)`,
      [randomUUID(), activation.user_id, req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||null, req.headers.get("user-agent")||null]
    );
    await client.query("COMMIT");
    return NextResponse.json({ success: true, message: "Account activated. You can now sign in." });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[ACTIVATE ACCOUNT] Error:", error);
    return NextResponse.json({ error: "Unable to activate account" }, { status: 500 });
  } finally { client.release(); }
}
