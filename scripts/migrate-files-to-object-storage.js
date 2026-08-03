/* Safe, resumable migration. Existing BYTEA data is retained until VERIFY_AND_CLEANUP=true. */
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const bucket = process.env.SUPABASE_PRIVATE_STORAGE_BUCKET || "uploads-private";
  const files = await pool.query("SELECT * FROM uploaded_files WHERE data IS NOT NULL AND storage_provider='database' ORDER BY created_at LIMIT $1", [Number(process.env.MIGRATION_BATCH_SIZE || 100)]);
  for (const file of files.rows) {
    const checksum = crypto.createHash("sha256").update(file.data).digest("hex");
    const key = `${file.workspace_id || "legacy"}/${file.uploaded_by || "unknown"}/${file.id}/${file.filename}`;
    const { error } = await client.storage.from(bucket).upload(key, file.data, { contentType: file.mimetype, upsert: false });
    if (error && !/already exists/i.test(error.message || "")) throw error;
    const downloaded = await client.storage.from(bucket).download(key);
    if (downloaded.error || !downloaded.data) throw downloaded.error || new Error("Verification download failed");
    const remoteChecksum = crypto.createHash("sha256").update(Buffer.from(await downloaded.data.arrayBuffer())).digest("hex");
    if (checksum !== remoteChecksum) throw new Error(`Checksum mismatch for ${file.id}`);
    await pool.query("UPDATE uploaded_files SET storage_provider='supabase',storage_bucket=$2,object_path=$3,checksum=$4 WHERE id=$1", [file.id, bucket, key, checksum]);
    if (process.env.VERIFY_AND_CLEANUP === "true") await pool.query("UPDATE uploaded_files SET data=NULL WHERE id=$1 AND checksum=$2", [file.id, checksum]);
  }
  await pool.end();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
