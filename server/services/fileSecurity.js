const crypto = require("crypto");
const path = require("path");

const MIME_EXTENSIONS = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel.sheet.macroEnabled.12": [".xlsm"],
  "application/vnd.ms-word.document.macroEnabled.12": [".docm"],
};

class FileValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "FileValidationError";
    this.statusCode = 400;
  }
}

function configuredMimeTypes() {
  return (process.env.ALLOWED_UPLOAD_MIME_TYPES || Object.keys(MIME_EXTENSIONS).join(","))
    .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
}

function isMimeAllowed(mime) {
  return configuredMimeTypes().some((configured) => configured === mime ||
    (configured.endsWith("/*") && mime.startsWith(configured.slice(0, -1))) ||
    (configured.endsWith("/") && mime.startsWith(configured)));
}

function sanitizeFilename(name) {
  const extension = path.extname(String(name || "")).toLowerCase();
  const base = path.basename(String(name || "file"), extension)
    .normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_")
    .replace(/^\.+/, "").slice(0, 120) || "file";
  return `${base}${extension}`;
}

function signatureMatches(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  if (mime === "application/pdf") return buffer.subarray(0, 5).toString() === "%PDF-";
  if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
  if (mime === "image/webp") return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  if (mime.includes("openxmlformats") || mime.includes("macroEnabled")) return buffer[0] === 0x50 && buffer[1] === 0x4b;
  if (mime === "application/msword" || mime === "application/vnd.ms-excel") {
    return buffer.subarray(0, 8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]));
  }
  return false;
}

function validateFile({ buffer, originalName, mimeType, size }) {
  const suppliedMime = String(mimeType || "").toLowerCase();
  const mime = suppliedMime === "image/jpg" ? "image/jpeg" : suppliedMime;
  const extension = path.extname(String(originalName || "")).toLowerCase();
  const maxBytes = Number(process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024);
  if (!buffer || size <= 0) throw new FileValidationError("Empty file");
  if (size > maxBytes) throw new FileValidationError("File exceeds maximum upload size");
  if (!MIME_EXTENSIONS[mime] || !isMimeAllowed(mime)) throw new FileValidationError("Unsupported MIME type");
  if (!MIME_EXTENSIONS[mime].includes(extension)) throw new FileValidationError("File extension does not match MIME type");
  if (!signatureMatches(buffer, mime)) throw new FileValidationError("File signature does not match MIME type");
  return { safeName: sanitizeFilename(originalName), checksum: crypto.createHash("sha256").update(buffer).digest("hex"), mime };
}

function createStorageKey({ workspaceId, userId, fileId, safeName }) {
  const tenant = String(workspaceId || "profiles").replace(/[^a-zA-Z0-9_-]/g, "_");
  const owner = String(userId).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${tenant}/${owner}/${fileId}/${safeName}`;
}

async function runVirusScanHook({ buffer, metadata }) {
  const endpoint = process.env.VIRUS_SCAN_WEBHOOK_URL;
  if (!endpoint) return { status: "not_configured" };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": metadata.mime, "x-file-checksum": metadata.checksum },
    body: buffer,
    signal: AbortSignal.timeout(Number(process.env.VIRUS_SCAN_TIMEOUT_MS || 15000)),
  });
  if (!response.ok) throw new Error("Virus scan rejected or failed");
  const result = await response.json().catch(() => ({}));
  if (result.clean === false) throw new Error("File rejected by virus scanner");
  return { status: "clean" };
}

module.exports = { createStorageKey, FileValidationError, isMimeAllowed, runVirusScanHook, sanitizeFilename, signatureMatches, validateFile };
