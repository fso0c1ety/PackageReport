const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { createClient } = require("@supabase/supabase-js");
const { createStorageKey, runVirusScanHook, validateFile } = require("../services/fileSecurity");

function uploadMiddleware() {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024) },
    fileFilter(_req, file, callback) {
      const allowed = (process.env.ALLOWED_UPLOAD_MIME_TYPES || [
        "image/jpeg", "image/jpg", "image/png", "application/pdf", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel.sheet.macroEnabled.12", "application/vnd.ms-word.document.macroEnabled.12",
      ].join(",")).split(",").map((item) => item.trim()).filter(Boolean);
      const valid = allowed.some((type) => file.mimetype === type || file.mimetype.startsWith(type));
      callback(valid ? null : new Error("Unsupported file type"), valid);
    },
  }).single("file");
}

function createUploadsRouter({ db, getRowAccess, getTableAccess, getWorkspaceAccess, logger, sharedUploadDir, legacyUploadDir }) {
  const router = express.Router();
  router.post("/upload", (req, res) => {
    uploadMiddleware()(req, res, async (error) => {
      if (error) return res.status(500).json({ error: "Multer upload error" });
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      try {
        const tableId = req.body?.tableId || null;
        const rowId = req.body?.rowId || null;
        const workspaceId = req.body?.workspaceId || null;
        const visibility = req.body?.purpose === "avatar" ? "profile" : "tenant";
        if (rowId && !(await getRowAccess(db, rowId, req.user.id, "editor", tableId))) {
          return res.status(404).json({ error: "Row not found or forbidden" });
        }
        if (!rowId && tableId && !(await getTableAccess(db, tableId, req.user.id, "editor"))) {
          return res.status(404).json({ error: "Table not found or forbidden" });
        }
        if (!rowId && !tableId && workspaceId && !(await getWorkspaceAccess(db, workspaceId, req.user.id, "member"))) {
          return res.status(404).json({ error: "Workspace not found or forbidden" });
        }
        const security = validateFile({ buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size });
        const scan = await runVirusScanHook({ buffer: req.file.buffer, metadata: security });
        const fileId = uuidv4();
        const filename = createStorageKey({ workspaceId, userId: req.user.id, fileId, safeName: security.safeName });
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
        const storageBucket = visibility === "profile"
          ? (process.env.SUPABASE_STORAGE_BUCKET || "uploads")
          : (process.env.SUPABASE_PRIVATE_STORAGE_BUCKET || "uploads-private");

        if (supabaseUrl && supabaseKey) {
          const storage = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
          const result = await storage.storage.from(storageBucket).upload(filename, req.file.buffer, { contentType: security.mime, upsert: false });
          if (result.error) throw result.error;
          await db.query(
            `INSERT INTO uploaded_files
              (id,filename,originalname,mimetype,size,uploaded_by,workspace_id,table_id,row_id,visibility,storage_provider,storage_bucket,object_path,checksum,virus_scan_status,created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'supabase',$11,$12,$13,$14,NOW())`,
            [fileId, filename, req.file.originalname, security.mime, req.file.size, req.user.id, workspaceId, tableId, rowId, visibility,
              storageBucket, filename, security.checksum, scan.status],
          );
          await db.query("INSERT INTO file_audit_log(id,file_id,user_id,action,workspace_id,metadata) VALUES($1,$2,$3,'upload',$4,$5::jsonb)",
            [uuidv4(), fileId, req.user.id, workspaceId, JSON.stringify({ checksum: security.checksum, size: req.file.size, mime: security.mime })]).catch(() => undefined);
          return res.json({ id: fileId, url: `/uploads/${encodeURIComponent(fileId)}`, name: req.file.originalname, originalName: req.file.originalname, type: security.mime, size: req.file.size, persisted: true });
        }

        if (process.env.NODE_ENV === "production") return res.status(503).json({ error: "Private object storage is not configured" });
        let filePath = path.join(sharedUploadDir, filename);
        try {
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, req.file.buffer);
        } catch (primaryError) {
          logger.warn("shared_upload_write_failed", { error: primaryError.message });
          filePath = path.join(legacyUploadDir, filename);
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, req.file.buffer);
        }

        let persistedToDb = true;
        try {
          await db.query(
            `INSERT INTO uploaded_files
              (id,filename,originalname,mimetype,size,uploaded_by,workspace_id,table_id,row_id,visibility,storage_provider,storage_path,checksum,virus_scan_status,created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'filesystem',$11,$12,$13,NOW())`,
            [fileId, filename, req.file.originalname, security.mime, req.file.size,
              req.user.id, workspaceId, tableId, rowId, visibility, filePath, security.checksum, scan.status],
          );
        } catch (databaseError) {
          persistedToDb = false;
          logger.error("upload_database_persistence_failed", { fileId, error: databaseError.message });
        }

        return res.json({
          id: fileId,
          url: `/uploads/${encodeURIComponent(filename)}`,
          name: req.file.originalname,
          originalName: req.file.originalname,
          type: req.file.mimetype,
          size: req.file.size,
          persisted: persistedToDb,
        });
      } catch (uploadError) {
        logger.error("upload_failed", { requestId: req.requestId, error: uploadError.message });
        return res.status(500).json({ error: "Failed to persist file data", details: uploadError.message });
      }
    });
  });
  return router;
}

module.exports = { createUploadsRouter, uploadMiddleware };
