import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, pool } from "../../api/_lib/server";
import { requireFilePermission } from "../../api/_lib/authorization";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);
    const access = await requireFilePermission(pool, user.id, decodedFilename, "viewer");
    if (!access) return NextResponse.json({ error: "File not found or forbidden" }, { status: 404 });
    const fileRecord = access.file;

    if (fileRecord.storage_provider === "supabase") {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY;
      if (!url || !key) return NextResponse.json({ error: "Storage is unavailable" }, { status: 503 });
      const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await client.storage.from(fileRecord.storage_bucket || "uploads-private").createSignedUrl(fileRecord.object_path, 60, {
        download: fileRecord.originalname || decodedFilename,
      });
      if (error || !data?.signedUrl) return NextResponse.json({ error: "File not found" }, { status: 404 });
      await pool.query("INSERT INTO file_audit_log(id,file_id,user_id,action,workspace_id,metadata) VALUES(gen_random_uuid()::text,$1,$2,'download',$3,'{}'::jsonb)",
        [fileRecord.id, user.id, fileRecord.workspace_id]).catch(() => undefined);
      return NextResponse.redirect(data.signedUrl, 307);
    }

    if (!fileRecord.data) {
      const candidates = [
        fileRecord.storage_path,
        path.join(process.cwd(), "uploads", decodedFilename),
        path.join(process.cwd(), "uploads", filename),
        path.join(process.cwd(), "server", "uploads", decodedFilename),
        path.join(process.cwd(), "server", "uploads", filename),
      ];

      for (const p of candidates.filter(Boolean)) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          const fileData = fs.readFileSync(p);
          const ext = path.extname(p).toLowerCase();
          const mimeMap = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls": "application/vnd.ms-excel",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          };
          return new NextResponse(fileData, {
            status: 200,
            headers: {
              "Content-Type": mimeMap[ext] || "application/octet-stream",
              "Content-Disposition": `inline; filename="${encodeURIComponent(decodedFilename)}"`,
              "Cache-Control": "private, no-store",
            },
          });
        }
      }

      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return new NextResponse(fileRecord.data, {
      status: 200,
      headers: {
        "Content-Type": fileRecord.mimetype || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileRecord.originalname || decodedFilename)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[UPLOADS][GET] Error:", err);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
