import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "../_lib/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  "";
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "uploads";

async function ensureBucketExists(supabase, bucket) {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("[UPLOAD][SUPABASE] Failed to list buckets:", error);
    return { ok: false, created: false, reason: error.message || String(error) };
  }

  const exists = Array.isArray(data) && data.some((b) => b.name === bucket);
  if (exists) {
    return { ok: true, created: false };
  }

  const { error: createErr } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: "50MB",
  });

  if (createErr) {
    console.error("[UPLOAD][SUPABASE] Failed to create bucket:", createErr);
    return { ok: false, created: false, reason: createErr.message || String(createErr) };
  }

  return { ok: true, created: true };
}

function sanitizeFilename(name) {
  return String(name || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 160);
}

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Missing Supabase Storage server credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE).",
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

    const safeName = sanitizeFilename(file.name);
    const objectName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
    const objectPath = `${user.id}/${objectName}`;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const doUpload = () =>
      supabase.storage
      .from(bucketName)
      .upload(objectPath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    let { error: uploadError } = await doUpload();

    // Auto-heal if bucket is missing in production configuration.
    if (uploadError && /bucket not found/i.test(uploadError.message || "")) {
      const ensured = await ensureBucketExists(supabase, bucketName);
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
      return NextResponse.json(
        {
          error: "Failed to upload file",
          details: uploadError.message || String(uploadError),
        },
        { status: 500 }
      );
    }

    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(objectPath);

    const publicUrl = publicData?.publicUrl || "";

    return NextResponse.json({
      id: objectPath,
      url: publicUrl,
      name: file.name,
      originalName: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      path: objectPath,
      bucket: bucketName,
    });
  } catch (err) {
    console.error("[UPLOAD][POST] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
