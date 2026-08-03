# Phase 6 file storage and upload security

New production uploads use a private Supabase Storage bucket. PostgreSQL stores tenant metadata, SHA-256 checksum, scan state and an audit trail; it no longer receives new file binaries. Development can use a filesystem fallback, while legacy database binaries remain downloadable.

Required production configuration: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_PRIVATE_STORAGE_BUCKET`. Set `VIRUS_SCAN_WEBHOOK_URL` to enable the blocking malware-scanning hook.

Run `npm run files:migrate` in controlled batches to copy legacy binaries. The script uploads, downloads, and checksum-verifies each object before updating metadata. It keeps the original `BYTEA` by default; only a separately approved run with `VERIFY_AND_CLEANUP=true` clears verified legacy bytes.
