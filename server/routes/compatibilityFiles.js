const express = require("express");
const fs = require("fs");
const path = require("path");

function createCompatibilityFilesRouter({ db, legacyUploadDir, logger, sharedUploadDir }) {
  const router = express.Router();
  router.use("/uploads", express.static(sharedUploadDir));
  router.use("/uploads", express.static(legacyUploadDir));
  router.get("/uploads/:filename", async (req, res) => {
    const filename = req.params.filename;
    const decodedFilename = decodeURIComponent(filename);
    try {
      const result = await db.query(
        "SELECT mimetype, data FROM uploaded_files WHERE filename = $1 OR filename = $2",
        [filename, decodedFilename],
      );
      if (result.rows.length) {
        const file = result.rows[0];
        res.setHeader("Content-Type", file.mimetype || "application/octet-stream");
        res.setHeader("Cache-Control", "public, max-age=31536000");
        return res.send(file.data);
      }
    } catch (error) {
      logger.error("database_file_serve_failed", { filename: decodedFilename, error: error.message });
    }
    const candidates = [
      path.join(sharedUploadDir, decodedFilename),
      path.join(sharedUploadDir, filename),
      path.join(legacyUploadDir, decodedFilename),
      path.join(legacyUploadDir, filename),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return res.sendFile(candidate);
    }
    return res.status(404).json({ error: "File not found" });
  });
  return router;
}

module.exports = { createCompatibilityFilesRouter };
