# Smart Manage

Smart Manage is a monday.com-style SaaS collaboration and work-management platform. It supports workspaces, boards, dynamic columns, items/tasks, files, comments, board chat, realtime collaboration, notifications, automations, Excel import/export flows, and an Electron desktop build.

## Architecture

- `src/app` contains the Next.js app, dashboard UI, board UI, and compatibility API routes.
- `server/index.js` starts the production server.
- `server/server.js` is the legacy Express/Socket.IO compatibility layer. New backend code is being extracted into:
  - `server/config`
  - `server/middleware`
  - `server/services`
  - `server/jobs`
  - `server/db`
  - `server/utils`
- `server/db/migrations` contains SQL migrations. Schema changes should be added here, not run automatically on server startup.
- `electron` preserves the SMART MANAGE desktop packaging entrypoint.

## Setup

1. Copy `.env.example` to `.env`.
2. Set at least:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_SOCKET_URL`
   - `NEXT_PUBLIC_FRONTEND_URL`
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run migrations:
   ```bash
   npm run db:migrate
   ```
5. Start development:
   ```bash
   npm run dev
   npm run start
   ```

## Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:migrate
npm run desktop:build
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL/Supabase connection string.
- `JWT_SECRET` or `SECRET_KEY`: required JWT signing secret. Use a long random value.
- `NEXT_PUBLIC_API_URL`: frontend API base URL.
- `NEXT_PUBLIC_SOCKET_URL`: Socket.IO server URL.
- `NEXT_PUBLIC_FRONTEND_URL`: public frontend origin.
- `CORS_ORIGINS`: comma-separated allowed origins.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase browser key.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key for storage uploads.
- `SUPABASE_STORAGE_BUCKET`: upload bucket name.
- `FIREBASE_*`: push notification credentials, if enabled.
- `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`: transactional email delivery for password recovery.
- `SMTP_*`: optional email notification credentials for integrations that use SMTP.
- `REDIS_URL`: optional future BullMQ/Redis backend. The current queue has a safe in-memory fallback.
- `MAX_UPLOAD_BYTES`: maximum upload size.
- `ALLOWED_UPLOAD_MIME_TYPES`: comma-separated MIME types or prefixes.

## Production Notes

- Do not commit real secrets.
- Do not enable `RUN_STARTUP_MIGRATIONS=true` in production unless doing a controlled compatibility rollout.
- Run `npm run db:migrate` during deployment.
- Socket.IO connections require JWT authentication and table joins are permission-checked.
- File uploads are authenticated, size-limited, MIME-checked, and filename-sanitized.
