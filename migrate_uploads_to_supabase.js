/*
  One-time migration: legacy /uploads/* files -> Supabase Storage public URLs.

  What it does:
  1) Uploads legacy files to Supabase Storage bucket.
     - Source priority: local uploads folder, then uploaded_files.data (BYTEA).
  2) Rewrites legacy URLs in DB:
     - users.avatar
     - table_chats.attachment.url
     - rows.values (deep recursive scan for any string URL)

  Usage:
    node migrate_uploads_to_supabase.js --dry-run
    node migrate_uploads_to_supabase.js --apply

  Required env vars:
    DATABASE_URL
    NEXT_PUBLIC_SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY

  Optional env vars:
    NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET (default: uploads)
    SUPABASE_STORAGE_BUCKET (fallback name)
*/

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const args = new Set(process.argv.slice(2));
const isApply = args.has('--apply');
const isDryRun = args.has('--dry-run') || !isApply;

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
  process.env.SUPABASE_STORAGE_BUCKET ||
  'uploads';

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}
if (!SUPABASE_URL) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const projectRoot = __dirname;
const uploadDir = path.join(projectRoot, 'uploads');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function decodeSafe(v) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function extractLegacyFilenameFromUrl(url) {
  if (typeof url !== 'string' || !url) return null;

  const trimmed = url.trim();

  // Already a Supabase storage URL -> skip.
  if (/\/storage\/v1\/object\//i.test(trimmed)) {
    return null;
  }

  // Match both relative and absolute legacy upload paths.
  const match = trimmed.match(/(?:^|https?:\/\/[^/]+)\/uploads\/([^?#]+)/i);
  if (!match) return null;

  return decodeSafe(match[1]);
}

function buildSupabasePublicUrl(filename) {
  return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(filename)}`;
}

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function transformJsonDeep(value, replaceFn) {
  if (typeof value === 'string') {
    return replaceFn(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => transformJsonDeep(item, replaceFn));
  }

  if (isObject(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = transformJsonDeep(v, replaceFn);
    }
    return out;
  }

  return value;
}

async function getLegacyBinaryMaps() {
  const byFilename = new Map();

  // 1) Load from local uploads folder when present.
  if (fs.existsSync(uploadDir)) {
    const localFiles = fs.readdirSync(uploadDir, { withFileTypes: true });
    for (const entry of localFiles) {
      if (!entry.isFile()) continue;
      const full = path.join(uploadDir, entry.name);
      const buf = fs.readFileSync(full);
      byFilename.set(entry.name, {
        source: 'local',
        filename: entry.name,
        mimetype: 'application/octet-stream',
        buffer: buf,
      });
    }
  }

  // 2) Fallback from uploaded_files table (BYTEA).
  const uploadedFilesRes = await pool.query(
    'SELECT filename, originalname, mimetype, size, data FROM uploaded_files'
  );

  for (const row of uploadedFilesRes.rows) {
    if (!row.filename || !row.data) continue;
    if (byFilename.has(row.filename)) continue;

    byFilename.set(row.filename, {
      source: 'db',
      filename: row.filename,
      originalname: row.originalname,
      mimetype: row.mimetype || 'application/octet-stream',
      size: Number(row.size || 0),
      buffer: Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data),
    });
  }

  return byFilename;
}

async function ensureBucketExists() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;

  const exists = (data || []).some((b) => b.name === BUCKET);
  if (exists) return;

  if (isDryRun) {
    console.log(`[dry-run] Bucket '${BUCKET}' does not exist; would create it.`);
    return;
  }

  const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: '50MB',
  });

  if (createErr) throw createErr;
  console.log(`Created bucket '${BUCKET}'.`);
}

async function uploadLegacyFileIfNeeded(filename, binaryMap) {
  const publicUrl = buildSupabasePublicUrl(filename);

  // Check if object already exists.
  const { data: existingData, error: existingErr } = await supabase.storage
    .from(BUCKET)
    .list('', { search: filename, limit: 100 });

  if (!existingErr && Array.isArray(existingData) && existingData.some((f) => f.name === filename)) {
    return { publicUrl, uploaded: false, reason: 'already-exists' };
  }

  const source = binaryMap.get(filename);
  if (!source || !source.buffer || source.buffer.length === 0) {
    return { publicUrl, uploaded: false, reason: 'missing-binary' };
  }

  if (isDryRun) {
    return { publicUrl, uploaded: false, reason: `dry-run:${source.source}` };
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, source.buffer, {
      upsert: true,
      contentType: source.mimetype || 'application/octet-stream',
    });

  if (error) {
    return { publicUrl, uploaded: false, reason: `upload-error:${error.message}` };
  }

  return { publicUrl, uploaded: true, reason: source.source };
}

async function migrateUsersAvatar(filenameMap, binaryMap) {
  const res = await pool.query('SELECT id, avatar FROM users WHERE avatar IS NOT NULL');
  let changed = 0;

  for (const row of res.rows) {
    const legacy = extractLegacyFilenameFromUrl(row.avatar);
    if (!legacy) continue;

    if (!filenameMap.has(legacy)) {
      const uploadResult = await uploadLegacyFileIfNeeded(legacy, binaryMap);
      filenameMap.set(legacy, uploadResult.publicUrl);
      console.log(`[users.avatar] ${legacy} -> ${uploadResult.reason}`);
    }

    const newUrl = filenameMap.get(legacy);
    if (!newUrl || newUrl === row.avatar) continue;

    changed += 1;
    if (!isDryRun) {
      await pool.query('UPDATE users SET avatar = $1 WHERE id = $2', [newUrl, row.id]);
    }
  }

  return changed;
}

async function migrateTableChatAttachment(filenameMap, binaryMap) {
  const res = await pool.query('SELECT id, attachment FROM table_chats WHERE attachment IS NOT NULL');
  let changed = 0;

  for (const row of res.rows) {
    const att = row.attachment;
    if (!att || typeof att !== 'object') continue;

    const oldUrl = att.url;
    const legacy = extractLegacyFilenameFromUrl(oldUrl);
    if (!legacy) continue;

    if (!filenameMap.has(legacy)) {
      const uploadResult = await uploadLegacyFileIfNeeded(legacy, binaryMap);
      filenameMap.set(legacy, uploadResult.publicUrl);
      console.log(`[table_chats.attachment] ${legacy} -> ${uploadResult.reason}`);
    }

    const newUrl = filenameMap.get(legacy);
    if (!newUrl || newUrl === oldUrl) continue;

    const newAttachment = { ...att, url: newUrl };
    changed += 1;
    if (!isDryRun) {
      await pool.query('UPDATE table_chats SET attachment = $1::jsonb WHERE id = $2', [
        JSON.stringify(newAttachment),
        row.id,
      ]);
    }
  }

  return changed;
}

async function migrateRowsValues(filenameMap, binaryMap) {
  const res = await pool.query('SELECT id, values FROM rows WHERE values IS NOT NULL');
  // First pass: collect all legacy filenames found in rows.values.
  for (const row of res.rows) {
    const original = row.values;
    if (!original || typeof original !== 'object') continue;

    transformJsonDeep(original, (str) => {
      const legacy = extractLegacyFilenameFromUrl(str);
      if (legacy && !filenameMap.has(legacy)) {
        filenameMap.set(legacy, null);
      }
      return str;
    });
  }

  // Resolve/upload all discovered files before any update pass.
  for (const [filename, url] of filenameMap.entries()) {
    if (url) continue;
    const uploadResult = await uploadLegacyFileIfNeeded(filename, binaryMap);
    filenameMap.set(filename, uploadResult.publicUrl);
    console.log(`[rows.values] ${filename} -> ${uploadResult.reason}`);
  }

  // Second pass: persist rewritten URLs.
  let changed = 0;
  for (const row of res.rows) {
    const original = row.values;
    if (!original || typeof original !== 'object') continue;

    const finalTransformed = transformJsonDeep(original, (str) => {
      const legacy = extractLegacyFilenameFromUrl(str);
      if (!legacy) return str;
      return filenameMap.get(legacy) || str;
    });

    if (JSON.stringify(finalTransformed) === JSON.stringify(original)) continue;

    changed += 1;
    if (!isDryRun) {
      await pool.query('UPDATE rows SET values = $1::jsonb WHERE id = $2', [
        JSON.stringify(finalTransformed),
        row.id,
      ]);
    }
  }

  return changed;
}

async function main() {
  console.log(`Mode: ${isDryRun ? 'dry-run' : 'apply'}`);
  console.log(`Bucket: ${BUCKET}`);

  await ensureBucketExists();

  const binaryMap = await getLegacyBinaryMaps();
  const filenameToPublicUrl = new Map();

  const usersChanged = await migrateUsersAvatar(filenameToPublicUrl, binaryMap);
  const chatsChanged = await migrateTableChatAttachment(filenameToPublicUrl, binaryMap);
  const rowsChanged = await migrateRowsValues(filenameToPublicUrl, binaryMap);

  console.log('--- Migration Summary ---');
  console.log(`users.avatar updated: ${usersChanged}`);
  console.log(`table_chats.attachment updated: ${chatsChanged}`);
  console.log(`rows.values updated: ${rowsChanged}`);
  console.log(`legacy filenames discovered: ${filenameToPublicUrl.size}`);

  const unresolved = [...filenameToPublicUrl.entries()].filter(([, url]) => !url);
  if (unresolved.length > 0) {
    console.log('Unresolved legacy files (missing local/db binary):');
    unresolved.slice(0, 20).forEach(([name]) => console.log(` - ${name}`));
    if (unresolved.length > 20) {
      console.log(` ... and ${unresolved.length - 20} more`);
    }
  }

  if (isDryRun) {
    console.log('Dry-run complete. Re-run with --apply to persist updates.');
  } else {
    console.log('Apply complete.');
  }
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
