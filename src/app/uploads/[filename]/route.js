import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { pool } from "../../api/_lib/server";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  try {
    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);
    const dbRes = await pool.query(
      "SELECT mimetype, originalname, data FROM uploaded_files WHERE filename = $1 OR filename = $2",
      [filename, decodedFilename]
    );

    if (!dbRes.rows[0]) {
      const candidates = [
        path.join(process.cwd(), "uploads", decodedFilename),
        path.join(process.cwd(), "uploads", filename),
        path.join(process.cwd(), "server", "uploads", decodedFilename),
        path.join(process.cwd(), "server", "uploads", filename),
      ];

      for (const p of candidates) {
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
              "Cache-Control": "public, max-age=31536000",
            },
          });
        }
      }

      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileRecord = dbRes.rows[0];

    return new NextResponse(fileRecord.data, {
      status: 200,
      headers: {
        "Content-Type": fileRecord.mimetype || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileRecord.originalname || decodedFilename)}"`,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (err) {
    console.error("[UPLOADS][GET] Error:", err);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
