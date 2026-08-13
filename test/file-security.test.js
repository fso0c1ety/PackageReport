const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { createStorageKey, isMimeAllowed, sanitizeFilename, signatureMatches, validateFile } = require("../server/services/fileSecurity");

test("file names and storage keys cannot escape tenant directories", () => {
  assert.equal(sanitizeFilename("../../invoice bad.pdf"), "invoice_bad.pdf");
  assert.equal(createStorageKey({ workspaceId: "w/1", userId: "u/1", fileId: "f1", safeName: "a.pdf" }), "w_1/u_1/f1/a.pdf");
});

test("upload validation checks extension, MIME and binary signature", () => {
  const pdf = Buffer.from("%PDF-1.7 test");
  assert.equal(signatureMatches(pdf, "application/pdf"), true);
  assert.equal(validateFile({ buffer: pdf, originalName: "test.pdf", mimeType: "application/pdf", size: pdf.length }).checksum.length, 64);
  assert.throws(() => validateFile({ buffer: pdf, originalName: "test.png", mimeType: "application/pdf", size: pdf.length }), /extension/);
});

test("upload MIME configuration accepts safe media families and rejects unsupported files as validation errors", () => {
  const previous = process.env.ALLOWED_UPLOAD_MIME_TYPES;
  process.env.ALLOWED_UPLOAD_MIME_TYPES = "image/*,application/pdf";
  try {
    const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
    assert.equal(isMimeAllowed("image/png"), true);
    assert.equal(validateFile({ buffer: png, originalName: "photo.png", mimeType: "image/png", size: png.length }).mime, "image/png");
    assert.throws(() => validateFile({ buffer: Buffer.from("bad"), originalName: "script.txt", mimeType: "text/plain", size: 3 }), (error) => error.name === "FileValidationError" && error.statusCode === 400);
  } finally {
    if (previous === undefined) delete process.env.ALLOWED_UPLOAD_MIME_TYPES;
    else process.env.ALLOWED_UPLOAD_MIME_TYPES = previous;
  }
});

test("secure storage migration retains legacy data unless cleanup is explicit", () => {
  const script = fs.readFileSync(path.join(__dirname, "../scripts/migrate-files-to-object-storage.js"), "utf8");
  assert.match(script, /VERIFY_AND_CLEANUP === "true"/);
  assert.match(script, /Checksum mismatch/);
  const migration = fs.readFileSync(path.join(__dirname, "../server/db/migrations/024_secure_object_storage.sql"), "utf8");
  assert.match(migration, /file_audit_log/);
  assert.match(migration, /checksum/);
});

test("private download route issues short-lived signed URLs after authorization", () => {
  const route = fs.readFileSync(path.join(__dirname, "../src/app/uploads/[filename]/route.js"), "utf8");
  assert.match(route, /requireFilePermission/);
  assert.match(route, /createSignedUrl\([^,]+, 60/);
});

test("upload route maps file validation failures to a professional 400 response", () => {
  const route = fs.readFileSync(path.join(__dirname, "../src/app/api/upload/route.js"), "utf8");
  assert.match(route, /error\?\.name === "FileValidationError"/);
  assert.match(route, /status: 400/);
});
