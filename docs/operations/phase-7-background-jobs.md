# Phase 7 background jobs

Production workers use BullMQ and the shared `REDIS_URL`. Jobs default to five attempts with exponential backoff, stable idempotency keys, retained status, structured error logging, and a dedicated dead-letter queue. Email delivery is queued automatically when Redis is configured; the in-memory implementation remains available for local development and deterministic tests.

Run the persistent backend separately from Vercel so workers remain alive. Configure `JOB_WORKER_CONCURRENCY` to match provider limits. Frontends can poll `GET /api/jobs/{jobId}?queue=smart-manage` for relevant long-running operation status.
