const express = require("express");
const fs = require("fs");
const path = require("path");

function createCompatibilityFilesRouter({ authenticateToken, db, legacyUploadDir, logger, requireFilePermission, sharedUploadDir }) {
  const router = express.Router();
  router.get("/uploads/:filename", authenticateToken, requireFilePermission("viewer"), async (req, res) => {
    const filename = req.params.filename;
    const decodedFilename = decodeURIComponent(filename);
    const authorizedFile = req.fileAccess?.file;
    try {
      if (authorizedFile?.data) {
        const file = authorizedFile;
        res.setHeader("Content-Type", file.mimetype || "application/octet-stream");
        res.setHeader("Cache-Control", "private, no-store");
        return res.send(file.data);
      }
    } catch (error) {
      logger.error("database_file_serve_failed", { filename: decodedFilename, error: error.message });
    }
    const candidates = [
      authorizedFile?.storage_path,
      authorizedFile?.filename && path.join(sharedUploadDir, authorizedFile.filename),
      authorizedFile?.filename && path.join(legacyUploadDir, authorizedFile.filename),
      path.join(sharedUploadDir, decodedFilename),
      path.join(sharedUploadDir, filename),
      path.join(legacyUploadDir, decodedFilename),
      path.join(legacyUploadDir, filename),
    ];
    for (const candidate of candidates.filter(Boolean)) {
      if (fs.existsSync(candidate)) {
        res.setHeader("Cache-Control", "private, no-store");
        return res.sendFile(candidate);
      }
    }
    return res.status(404).json({ error: "File not found" });
  });
  return router;
}

module.exports = { createCompatibilityFilesRouter };
