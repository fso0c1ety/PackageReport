import { NextResponse } from "next/server";
import { pool } from "../../api/_lib/server";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  try {
    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);
    const dbRes = await pool.query(
      "SELECT mimetype, data FROM uploaded_files WHERE filename = $1 OR filename = $2",
      [filename, decodedFilename]
    );

    if (!dbRes.rows[0]) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileRecord = dbRes.rows[0];

    return new NextResponse(fileRecord.data, {
      status: 200,
      headers: {
        "Content-Type": fileRecord.mimetype || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (err) {
    console.error("[UPLOADS][GET] Error:", err);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
