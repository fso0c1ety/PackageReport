const express = require('express');
const { configureCoreMiddleware, mountCoreRoutes } = require('./app');
const { createNexusRouter } = require('./routes/nexus');
const { createSystemRouter } = require('./routes/system');
const { createUploadsRouter } = require('./routes/uploads');
const { createPushNotificationsRouter } = require('./routes/pushNotifications');
const { createNotificationsRouter } = require('./routes/notifications');
const { createTableCollaborationRouter } = require('./routes/tableCollaboration');
const { createWorkspacesRouter } = require('./routes/workspaces');
const { createTableMetadataRouter } = require('./routes/tableMetadata');
const { createTaskReadsRouter } = require('./routes/taskReads');
const { createTaskMutationsRouter } = require('./routes/taskMutations');
const { createTaskUpdatesRouter } = require('./routes/taskUpdates');
const { createTableSharingRouter } = require('./routes/tableSharing');
const { createTeammatesRouter } = require('./routes/teammates');
const { createTableCreationRouter } = require('./routes/tableCreation');
const { createActivityUpdatesRouter } = require('./routes/activityUpdates');
const { createCompatibilityFilesRouter } = require('./routes/compatibilityFiles');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const db = require('./db');
const authenticateToken = require('./middleware/authenticateToken');
const { sendEmail } = require('./mailer');
const { sendPushNotification } = require('./firebase');
const { sendNotification } = require('./notificationHelper');
const { getAllowedOrigins, getJwtSecret } = require('./config/env');
const { createCorsMiddleware, socketCorsOptions } = require('./config/cors');
const requestContext = require('./middleware/requestContext');
const errorHandler = require('./middleware/errorHandler');
const { createRateLimiter } = require('./middleware/rateLimit');
const { getTableAccess } = require('./services/permissions');
const requireTablePermission = require('./middleware/requireTablePermission');
const { requireFilePermission, requireRowPermission, requireWorkspacePermission } = require('./middleware/authorization');
const { getFileAccess, getRowAccess, getWorkspaceAccess } = require('./services/permissions');
const tableService = require('./services/tableService');
const logger = require('./utils/logger');
logger.info('server_process_starting');
process.on('exit', (code) => logger.info('server_process_exit', { code }));
const { appQueue } = require('./jobs');
const { startScheduledMessageJob } = require('./jobs/scheduledMessages');
const billingService = require('./services/billingService');
const { normalizeActivityHtml } = require('./utils/formatCellValue');
const BUILD_COMMIT = process.env.RENDER_GIT_COMMIT || process.env.COMMIT_SHA || 'edc8e7463386ac815cb01ca7bdaa24346ba30c97';
const BUILD_DATE = '2026-03-28';

logger.info('server_build', { commit: BUILD_COMMIT, date: BUILD_DATE });

const http = require('http');
const { Server } = require("socket.io");
const { attachSocketServer } = require('./socket');
const { configureSocketRedisAdapter, createRealtimeState } = require('./realtime/redis');
const { bootstrap } = require('./bootstrap');
const dev = process.env.NODE_ENV !== 'production';
const next = require('next');
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const app = express();
const SHARED_UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const LEGACY_UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure upload directories exist so file writes do not fail with ENOENT.
for (const dir of [SHARED_UPLOAD_DIR, LEGACY_UPLOAD_DIR]) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (mkdirErr) {
    logger.error('upload_directory_create_failed', { directory: dir, error: mkdirErr.message });
  }
}

const corsOrigins = getAllowedOrigins();
const JWT_SECRET = getJwtSecret();
const apiRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: 240, keyPrefix: 'api' });

// Root endpoint handled by Next.js
// app.get('/', (req, res) => {
//   res.send('Backend is running!');
// });

const server = http.createServer(app);
const io = new Server(server, {
  cors: socketCorsOptions(corsOrigins),
  transports: ['websocket', 'polling'], // ensure websocket is enabled
  pingTimeout: 60000,
  pingInterval: 25000
});

attachSocketServer(io, {
  db,
  getTableAccess,
  jwtSecret: JWT_SECRET,
  logger,
  sendDirectNotification: require('./notificationHelper').sendDirectNotification,
  realtimeState: createRealtimeState({ logger }),
});

// --- Legacy Database Schema Migrations ---
let startupMigrationPromise = Promise.resolve();
if (process.env.RUN_STARTUP_MIGRATIONS === 'true') {
startupMigrationPromise = (async () => {
  try {
    await db.query(`
      ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS status TEXT;
      ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fcm_tokens JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title TEXT;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company TEXT;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name TEXT;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name TEXT;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_date DATE;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender TEXT;
      ALTER TABLE table_chats ADD COLUMN IF NOT EXISTS sender_id TEXT;
      ALTER TABLE table_chats ADD COLUMN IF NOT EXISTS attachment JSONB;
    `);
    await db.query(`ALTER TABLE tables ADD COLUMN IF NOT EXISTS shared_users JSONB DEFAULT '[]'::jsonb;`);
    await db.query(`UPDATE tables SET shared_users = '[]'::jsonb WHERE shared_users IS NULL;`);
    
    // Friends table
    await db.query(`
      CREATE TABLE IF NOT EXISTS friends (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        friend_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL,
        UNIQUE(user_id, friend_id)
      );
    `);

    // Migration for granular permissions: convert ['id1', 'id2'] to [{userId: 'id1', permission: 'edit'}, ...]
    await db.query(`
      UPDATE tables 
      SET shared_users = (
        SELECT jsonb_agg(jsonb_build_object('userId', elem, 'permission', 'edit'))
        FROM jsonb_array_elements_text(shared_users) AS elem
      )
      WHERE jsonb_typeof(shared_users) = 'array' 
      AND (jsonb_array_length(shared_users) = 0 OR jsonb_typeof(shared_users->0) = 'string');
    `);

    await db.query(`ALTER TABLE tables ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;`);
    
    // Fill missing invite codes for existing tables
    try {
      const missingCodes = await db.query('SELECT id FROM tables WHERE invite_code IS NULL');
      if (missingCodes.rows.length > 0) {
        logger.info('legacy_invite_codes_backfill_started', { count: missingCodes.rows.length });
        for (const table of missingCodes.rows) {
          const code = Math.random().toString(36).substring(2, 8).toUpperCase();
          await db.query('UPDATE tables SET invite_code = $1 WHERE id = $2', [code, table.id]);
        }
      }
    } catch (err) {
      logger.error('legacy_invite_codes_backfill_failed', { error: err.message });
    }

    logger.info('legacy_schema_migration_complete');
  } catch (err) {
    logger.error('legacy_schema_migration_failed', { error: err.message });
    throw err;
  }
})();
} else {
  logger.info('legacy_schema_migrations_skipped', { reason: 'Use npm run db:migrate' });
}

configureCoreMiddleware(app, {
  apiRateLimit,
  corsMiddleware: createCorsMiddleware(corsOrigins),
  logger,
  requestContext,
});

app.use('/api', createSystemRouter({ buildCommit: BUILD_COMMIT, buildDate: BUILD_DATE }));
// Register people and automation routes at /api
const authRoute = require('./routes/auth');
const billingRoute = require('./routes/billing');
const peopleRoute = require('./routes/people');
const automationRoute = require('./routes/automation');
const emailerRoute = require('./routes/emailer');
const friendsRoute = require('./routes/friends');
const chatsRoute = require('./routes/chats');
const { createUsersRouter } = require('./routes/users');

mountCoreRoutes(app, {
  authenticateToken,
  requireActiveSubscription: require('./middleware/requireActiveSubscription'),
  routes: {
    auth: authRoute,
    billing: billingRoute,
    users: createUsersRouter({ db, logger }),
    workspaces: createWorkspacesRouter({ db, logger }),
    tableMetadata: createTableMetadataRouter({ db, logger, requireTablePermission, requireWorkspacePermission }),
    taskReads: createTaskReadsRouter({ logger, requireTablePermission, requireRowPermission, tableService }),
    taskMutations: createTaskMutationsRouter({ db, getTableAccess, logger, requireTablePermission, requireRowPermission }),
    taskUpdates: createTaskUpdatesRouter({ appQueue, db, logger, requireRowPermission, sendNotification }),
    tableSharing: createTableSharingRouter({ billingService, db, logger, sendPushNotification }),
    teammates: createTeammatesRouter({ db, logger }),
    tableCreation: createTableCreationRouter({ db, logger }),
    activityUpdates: createActivityUpdatesRouter({ db, logger, normalizeActivityHtml }),
    nexus: createNexusRouter({ fetch, logger }),
    uploads: createUploadsRouter({ db, getRowAccess, getTableAccess, getWorkspaceAccess, logger, sharedUploadDir: SHARED_UPLOAD_DIR, legacyUploadDir: LEGACY_UPLOAD_DIR }),
    pushNotifications: createPushNotificationsRouter({ db, logger, sendPushNotification }),
    notifications: createNotificationsRouter({ db, logger }),
    tableCollaboration: createTableCollaborationRouter({ db, io, logger, requireTablePermission, sendPushNotification, tableService }),
    people: peopleRoute,
    automation: automationRoute,
    emailer: emailerRoute,
    friends: friendsRoute,
    chats: chatsRoute,
  },
});
app.use(createCompatibilityFilesRouter({ authenticateToken, db, legacyUploadDir: LEGACY_UPLOAD_DIR, logger, requireFilePermission, sharedUploadDir: SHARED_UPLOAD_DIR }));

// Port is handled after route registration
const PORT = process.env.PORT || 4000;







// Per-table tasks endpoints





app.use(errorHandler(logger));

process.on('uncaughtException', (err) => {
  logger.error('uncaught_exception', { error: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('unhandled_rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    promise: String(promise),
  });
});

const SKIP_NEXT_APP = process.env.SKIP_NEXT_APP === 'true';

bootstrap({
  app,
  handle,
  nextApp,
  server,
  port: PORT,
  skipNextApp: SKIP_NEXT_APP,
  beforeStart: async () => { await startupMigrationPromise; await configureSocketRedisAdapter(io, logger); },
  logger,
}).catch((error) => {
  logger.error('server_bootstrap_failed', { error: error.message });
  process.exit(1);
});

startScheduledMessageJob({ db, sendNotification, logger });
