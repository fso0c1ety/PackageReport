import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getAuthenticatedUser, pool } from "../_lib/server";
import { requireBoardPermission, requireRowPermission, requireWorkspacePermission } from "../_lib/authorization";
import fileSecurity from "../../../../server/services/fileSecurity";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  "";
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "uploads";
const privateBucketName = process.env.SUPABASE_PRIVATE_STORAGE_BUCKET || `${bucketName}-private`;
const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024);
const allowedMimePrefixes = (
  process.env.ALLOWED_UPLOAD_MIME_TYPES ||
  [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel.sheet.macroEnabled.12",
    "application/vnd.ms-word.document.macroEnabled.12",
  ].join(",")
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

async function ensureBucketExists(supabase, bucket, isPublic = false) {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("[UPLOAD][SUPABASE] Failed to list buckets:", error);
    return { ok: false, created: false, reason: error.message || String(error) };
  }

  const exists = Array.isArray(data) && data.some((b) => b.name === bucket);
  if (exists) {
    const { error: updateError } = await supabase.storage.updateBucket(bucket, { public: isPublic, fileSizeLimit: "50MB" });
    if (updateError) return { ok: false, created: false, reason: updateError.message || String(updateError) };
    return { ok: true, created: false };
  }

  const { error: createErr } = await supabase.storage.createBucket(bucket, {
    public: isPublic,
    fileSizeLimit: "50MB",
  });

  if (createErr) {
    console.error("[UPLOAD][SUPABASE] Failed to create bucket:", createErr);
    return { ok: false, created: false, reason: createErr.message || String(createErr) };
  }

  return { ok: true, created: true };
}

function isAllowedUpload(file) {
  return file.size <= maxUploadBytes &&
    allowedMimePrefixes.some((prefix) => file.type === prefix || file.type.startsWith(prefix));
}

async function validateUploadScope(formData, userId) {
  const workspaceId = String(formData.get("workspaceId") || "") || null;
  const tableId = String(formData.get("tableId") || "") || null;
  const rowId = String(formData.get("rowId") || "") || null;
  const visibility = formData.get("purpose") === "avatar" ? "profile" : "tenant";
  if (rowId && !(await requireRowPermission(pool, userId, rowId, "editor", tableId))) return null;
  if (!rowId && tableId && !(await requireBoardPermission(pool, userId, tableId, "editor"))) return null;
  if (!rowId && !tableId && workspaceId && !(await requireWorkspacePermission(pool, userId, workspaceId, "member"))) return null;
  return { workspaceId, tableId, rowId, visibility };
}

async function persistLocalUpload(file, fileBuffer, userId, scope, security) {
  const fileId = uuidv4();
  const safeName = security.safeName;
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
  const uploadsDir = path.join(process.cwd(), "uploads");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fullPath = path.join(uploadsDir, filename);
  fs.writeFileSync(fullPath, fileBuffer);

  try {
    await pool.query(
      `INSERT INTO uploaded_files
        (id,filename,originalname,mimetype,size,uploaded_by,workspace_id,table_id,row_id,visibility,storage_provider,storage_path,checksum,virus_scan_status,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'filesystem',$11,$12,$13,NOW())`,
      [fileId, filename, file.name, security.mime, file.size, userId,
        scope.workspaceId, scope.tableId, scope.rowId, scope.visibility, fullPath, security.checksum, security.virusScanStatus]
    );
  } catch (dbErr) {
    console.error("[UPLOAD][LOCAL] DB persistence skipped:", dbErr?.message || dbErr);
    throw dbErr;
  }

  return {
    id: fileId,
    url: `/uploads/${encodeURIComponent(fileId)}`,
    name: file.name,
    originalName: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    path: filename,
    bucket: "local",
    persisted: true,
  };
}

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Private object storage is not configured" }, { status: 503 });
    }
    try {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }
      if (!isAllowedUpload(file)) {
        return NextResponse.json({ error: "Unsupported file type or file too large" }, { status: 400 });
      }
      const scope = await validateUploadScope(formData, user.id);
      if (!scope) return NextResponse.json({ error: "Upload target not found or forbidden" }, { status: 404 });
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const security = fileSecurity.validateFile({ buffer: fileBuffer, originalName: file.name, mimeType: file.type, size: file.size });
      const scan = await fileSecurity.runVirusScanHook({ buffer: fileBuffer, metadata: security });
      security.virusScanStatus = scan.status;
      const local = await persistLocalUpload(file, fileBuffer, user.id, scope, security);
      return NextResponse.json(local);
    } catch (localErr) {
      return NextResponse.json(
        {
          error:
            "Missing Supabase Storage server credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE).",
          details: localErr?.message || String(localErr),
        },
        { status: 500 }
      );
    }
  }

  if (/^sb_publishable_/i.test(supabaseServiceRoleKey)) {
    return NextResponse.json(
      {
        error:
          "Invalid key for server upload. SUPABASE_SERVICE_ROLE_KEY must be the service role key, not a publishable key.",
      },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (!isAllowedUpload(file)) {
      return NextResponse.json({ error: "Unsupported file type or file too large" }, { status: 400 });
    }
    const scope = await validateUploadScope(formData, user.id);
    if (!scope) return NextResponse.json({ error: "Upload target not found or forbidden" }, { status: 404 });
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const security = fileSecurity.validateFile({ buffer: fileBuffer, originalName: file.name, mimeType: file.type, size: file.size });
    const scan = await fileSecurity.runVirusScanHook({ buffer: fileBuffer, metadata: security });
    security.virusScanStatus = scan.status;
    const fileId = uuidv4();
    const objectPath = fileSecurity.createStorageKey({ workspaceId: scope.workspaceId, userId: user.id, fileId, safeName: security.safeName });
    const targetBucket = scope.visibility === "profile" ? bucketName : privateBucketName;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const bucketState = await ensureBucketExists(supabase, targetBucket, scope.visibility === "profile");
    if (!bucketState.ok) {
      return NextResponse.json({ error: "Storage bucket is unavailable", details: bucketState.reason }, { status: 500 });
    }

    const doUpload = () =>
      supabase.storage
      .from(targetBucket)
      .upload(objectPath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    let { error: uploadError } = await doUpload();

    // Auto-heal if the bucket was removed between validation and upload.
    if (uploadError && /bucket not found/i.test(uploadError.message || "")) {
      const ensured = await ensureBucketExists(supabase, targetBucket, scope.visibility === "profile");
      if (ensured.ok) {
        ({ error: uploadError } = await doUpload());
      } else {
        return NextResponse.json(
          {
            error: "Failed to upload file",
            details: `Bucket not found and auto-create failed: ${ensured.reason || "unknown"}`,
          },
          { status: 500 }
        );
      }
    }

    if (uploadError) {
      console.error("[UPLOAD][SUPABASE] Upload error:", uploadError);
      try {
        if (process.env.NODE_ENV === "production") throw uploadError;
        const local = await persistLocalUpload(file, fileBuffer, user.id, scope, security);
        return NextResponse.json({ ...local, persisted: false, fallback: "local" });
      } catch (localErr) {
        return NextResponse.json(
          {
            error: "Failed to upload file",
            details: uploadError.message || String(uploadError),
            fallbackError: localErr?.message || String(localErr),
          },
          { status: 500 }
        );
      }
    }

    await pool.query(`INSERT INTO uploaded_files
      (id,filename,originalname,mimetype,size,uploaded_by,workspace_id,table_id,row_id,visibility,storage_provider,storage_bucket,object_path,checksum,virus_scan_status,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'supabase',$11,$12,$13,$14,NOW())`,
      [fileId, objectPath, file.name, security.mime, file.size, user.id,
        scope.workspaceId, scope.tableId, scope.rowId, scope.visibility, targetBucket, objectPath, security.checksum, security.virusScanStatus]);

    await pool.query("INSERT INTO file_audit_log(id,file_id,user_id,action,workspace_id,metadata) VALUES($1,$2,$3,'upload',$4,$5::jsonb)",
      [uuidv4(), fileId, user.id, scope.workspaceId, JSON.stringify({ checksum: security.checksum, size: file.size, mime: security.mime })]).catch(() => undefined);

    return NextResponse.json({
      id: fileId,
      url: `/uploads/${encodeURIComponent(fileId)}`,
      name: file.name,
      originalName: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      path: objectPath,
      bucket: targetBucket,
    });
  } catch (err) {
    console.error("[UPLOAD][POST] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
