// --- Task Order Endpoint for Drag-and-Drop ---
// (Endpoint is now placed at the end of the file, after all initialization)
console.log('Server process starting...');
process.on('exit', (code) => console.log(`Process exit with code: ${code}`));
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
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const multer = require('multer');
const ExcelJS = require('exceljs');
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
const tableService = require('./services/tableService');
const logger = require('./utils/logger');
const { appQueue } = require('./jobs');
const { startScheduledMessageJob } = require('./jobs/scheduledMessages');
const billingService = require('./services/billingService');
const { normalizeActivityHtml } = require('./utils/formatCellValue');
const BUILD_COMMIT = process.env.RENDER_GIT_COMMIT || process.env.COMMIT_SHA || 'edc8e7463386ac815cb01ca7bdaa24346ba30c97';
const BUILD_DATE = '2026-03-28';

console.log(`[Build] Commit: ${BUILD_COMMIT}`);
console.log(`[Build] Date: ${BUILD_DATE}`);

const http = require('http');
const { Server } = require("socket.io");
const { attachSocketServer } = require('./socket');
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
    console.error('[Upload] Failed to ensure upload directory:', dir, mkdirErr);
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
        console.log(`[DB] Backfilling invite codes for ${missingCodes.rows.length} tables...`);
        for (const table of missingCodes.rows) {
          const code = Math.random().toString(36).substring(2, 8).toUpperCase();
          await db.query('UPDATE tables SET invite_code = $1 WHERE id = $2', [code, table.id]);
        }
      }
    } catch (err) {
      console.error('[DB] Error backfilling invite codes:', err);
    }

    console.log('[DB] Schema checked/updated.');
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
    tableMetadata: createTableMetadataRouter({ db, logger }),
    taskReads: createTaskReadsRouter({ logger, requireTablePermission, tableService }),
    taskMutations: createTaskMutationsRouter({ db, getTableAccess, logger }),
    taskUpdates: createTaskUpdatesRouter({ appQueue, db, logger, sendNotification }),
    tableSharing: createTableSharingRouter({ billingService, db, logger, sendPushNotification }),
    teammates: createTeammatesRouter({ db, logger }),
    nexus: createNexusRouter({ fetch, logger }),
    uploads: createUploadsRouter({ db, logger, sharedUploadDir: SHARED_UPLOAD_DIR, legacyUploadDir: LEGACY_UPLOAD_DIR }),
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
// Serve uploaded files statically from the shared uploads directory first,
// then fall back to the legacy server-local directory for older files.
app.use('/uploads', express.static(SHARED_UPLOAD_DIR));
app.use('/uploads', express.static(LEGACY_UPLOAD_DIR));
// Explicitly handle file serving to debug or catch encoding issues
app.get('/uploads/:filename', async (req, res) => {
  const filename = req.params.filename;
  // Decode filename just in case it's still encoded
  const decodedFilename = decodeURIComponent(filename);
  
  // 1. Check PostgreSQL database first
  try {
      const dbRes = await db.query('SELECT mimetype, data FROM uploaded_files WHERE filename = $1 OR filename = $2', [filename, decodedFilename]);
      if (dbRes.rows.length > 0) {
          const fileRecord = dbRes.rows[0];
          res.setHeader('Content-Type', fileRecord.mimetype || 'application/octet-stream');
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
          return res.send(fileRecord.data);
      }
  } catch (err) {
      console.error('[Serve DB File Error]', err);
  }

  // 2. Fall back to disk (local files, if they exist)
  const candidates = [
    path.join(SHARED_UPLOAD_DIR, decodedFilename),
    path.join(SHARED_UPLOAD_DIR, filename),
    path.join(LEGACY_UPLOAD_DIR, decodedFilename),
    path.join(LEGACY_UPLOAD_DIR, filename),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return res.sendFile(candidate);
    }
  }

  res.status(404).json({ error: 'File not found' });
});

// Port is handled after route registration
const PORT = process.env.PORT || 4000;

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} body:`, req.body);
  next();
});

// Create a table (must provide workspaceId)
app.post('/api/tables', authenticateToken, async (req, res) => {
  if (!req.body.workspaceId) {
    return res.status(400).json({ error: 'workspaceId is required' });
  }

  try {
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [req.body.workspaceId]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) return res.sendStatus(403);

    let columns = req.body.columns;
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      columns = [
        { id: uuidv4(), name: 'Text', type: 'Text', order: 0 },
        {
          id: uuidv4(), name: 'Status', type: 'Status', order: 1, options: [
            { value: 'Started', color: '#1976d2' },
            { value: 'Working on it', color: '#fdab3d' },
            { value: 'Done', color: '#00c875' }
          ]
        },
        { id: uuidv4(), name: 'Date', type: 'Date', order: 2 }
      ];
    }

    // Country logic... (keeping it for compatibility)
    const fullCountryList = ["Afghanistan", "Albania", "Algeria" /* ... potentially truncated in snippet ... */]; // I'll skip the full list in the snippet if I can't see the end of it earlier, or just keep the logic

    const newTable = {
      id: uuidv4(),
      name: req.body.name,
      workspace_id: req.body.workspaceId,
      columns: columns,
      created_at: new Date().toISOString()
    };

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await db.query(
      'INSERT INTO tables (id, name, workspace_id, columns, created_at, invite_code) VALUES ($1, $2, $3, $4, $5, $6)',
      [newTable.id, newTable.name, newTable.workspace_id, JSON.stringify(newTable.columns), newTable.created_at, inviteCode]
    );

    res.json(newTable);
  } catch (err) {
    console.error('Error creating table:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper to convert Excel color to Hex
function getHexFromExcelColor(color) {
  if (!color) return null;
  
  let hex = "";
  if (color.argb) {
    // ARGB: remove alpha (A) and ensure 6 chars
    hex = color.argb.length === 8 ? color.argb.substring(2) : color.argb;
  } else if (color.theme !== undefined) {
    // Map standard Excel theme colors (Indices 0-9)
    const themeColors = {
      0: 'FFFFFF', // White
      1: '000000', // Black
      2: 'E7E6E6', // Light Gray
      3: '44546A', // Dark Blue
      4: '4472C4', // Accent 1
      5: 'ED7D31', // Accent 2
      6: 'A5A5A5', // Accent 3
      7: 'FFC000', // Accent 4
      8: '5B9BD5', // Accent 5
      9: '70AD47'  // Accent 6
    };
    hex = themeColors[color.theme] || null;
  }

  if (hex && /^[0-9A-Fa-f]{6}$/.test(hex)) {
    return `#${hex}`;
  }
  return null;
}

// Helper function to call Nexus Brain for Excel analysis
async function analyzeExcelWithNexusBrain(rawRows) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Nexus Brain API Key missing');

  // Take first 30 rows for analysis to provide more context
  const sample = rawRows.slice(0, 30);
  
  const systemPrompt = `You are the Nexus Brain, a world-class data engineering expert specializing in spreadsheet ingestion.
Analyze these raw spreadsheet rows and provide a highly accurate JSON schema.

OBJECTIVES:
1. "headerRowIndex": Find the exact 0-based index where the table headers start. Ignore metadata/trash rows at the top.
2. "dataStartRowIndex": Find where the actual data begins (usually headerRowIndex + 1).
3. "columns": Define each column with:
   - "name": The string name of the column.
   - "type": Choose the most appropriate type from: [Text, Status, Date, Numbers, Country, Dropdown].
   - "options": For 'Status' and 'Dropdown', identify unique values in the sample and suggest vibrant, professional hex colors (e.g., #00c875 for positive/done, #fdab3d for warning/in-progress, #e53935 for negative/blocked).
4. "skipRowIndices": Identify indices of empty rows, summary/total rows, or metadata that should NOT be imported as data rows.

PRECISE RULES:
- If headers span multiple rows, pick the main row containing identifying names.
- For Date columns, look for ISO strings, timestamps, or common date formats.
- For Numbers, identify if they are currency, percentages, or plain decimals.
- BE AGGRESSIVE in identifying summary rows at the bottom of the sample.

Return ONLY JSON:
{
  "headerRowIndex": number,
  "dataStartRowIndex": number,
  "columns": [
    { "name": string, "type": string, "options": [{ "value": string, "color": string }] }
  ],
  "skipRowIndices": [number]
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      "Authorization": `Bearer ${apiKey}` 
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is a sample of the Excel data in JSON format:\n${JSON.stringify(sample)}` }
      ],
      temperature: 0.1, // Low temperature for higher precision
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) throw new Error("Nexus Brain Analysis Failed");
  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  return result;
}

const normalizeMondayHeader = (value) =>
  String(value || '')
    .trim()
    .toLocaleUpperCase('sq-AL')
    .replace(/\s+/g, ' ');

function getMondayColumnType(header) {
  const normalized = normalizeMondayHeader(header);

  if (normalized === 'DATA') return 'Date';
  if (
    normalized === 'STATUSI I DERGESES'
    || normalized === 'LLOJI I DERGESES'
    || normalized === 'TERHEQJA E DERGESES NGA EKSPORTUESI'
    || normalized === 'DOREZIMI I DERGESES TEK KLIENTI'
  ) {
    return 'Status';
  }
  if (
    normalized === 'IMPORTUESI'
    || normalized === 'EKSPORTUESI'
    || normalized === 'TRANSPORTUESI'
    || normalized === 'SHTETI EKSPORTUES'
  ) {
    return 'Dropdown';
  }
  return 'Text';
}

function getMondayExportColumnType(typeValue, header) {
  const normalizedType = normalizeMondayHeader(typeValue);
  const exactTypeMap = {
    TEXT: 'Text',
    NUMBERS: 'Numbers',
    NUMBER: 'Numbers',
    STATUS: 'Status',
    'STATUSI I DERGESES': 'Status',
    DATE: 'Date',
    DROPDOWN: 'Dropdown',
    COUNTRY: 'Country',
  };
  return exactTypeMap[normalizedType] || getMondayColumnType(header);
}

function getMondayStatusOptions(header) {
  const normalized = normalizeMondayHeader(header);
  const emptyOption = { value: '', color: '#c4c4c4' };

  if (normalized === 'STATUSI I DERGESES') {
    return [
      { value: 'E NGARKUAR', color: '#66ccff' },
      { value: 'E ANULUAR', color: '#333333' },
      { value: 'E PERFUNDUAR', color: '#00c875' },
      { value: 'NE PRITJE', color: '#df2f4a' },
      emptyOption,
      { value: 'E ORGANIZUAR', color: '#ffcb00' },
      { value: 'NE DOGAN KS', color: '#9d50dd' },
    ];
  }
  if (normalized === 'LLOJI I DERGESES') {
    return [
      { value: 'PARCIALE', color: '#9aadbd' },
      { value: 'E PLOTE', color: '#007eb5' },
      emptyOption,
    ];
  }
  if (normalized === 'TERHEQJA E DERGESES NGA EKSPORTUESI') {
    return [
      { value: 'TERHEQJA E DERGESES ESHTE PERFUNDUAR ME SUKSES', color: '#00c875' },
      { value: 'TERHEQJA E DERGESES ESHTE ANULUAR', color: '#df2f4a' },
      { value: 'NE PRITJE', color: '#fdab3d' },
      emptyOption,
    ];
  }
  if (normalized === 'DOREZIMI I DERGESES TEK KLIENTI') {
    return [
      { value: 'DOREZIMI I DERGESES TEK KLIENTI ESHTE PERFUNDUAR ME SUKSES', color: '#00c875' },
      { value: 'DOREZIMI I DERGESES TEK KLIENTI ESHTE ANULUAR', color: '#df2f4a' },
      { value: 'ENDE E PA DOREZUAR', color: '#fdab3d' },
      emptyOption,
    ];
  }
  return [];
}

function analyzeMondayExport(rawRows) {
  const isMondayExport = rawRows.slice(0, 5).some((row) =>
    Array.isArray(row)
    && row.some((cell) => String(cell || '').toLowerCase().includes('created using monday.com'))
  );
  if (!isMondayExport) return null;

  const headerRowIndex = rawRows.findIndex((row) => {
    if (!Array.isArray(row)) return false;
    const headers = row.map(normalizeMondayHeader);
    return headers.includes('NAME')
      && headers.includes('STATUSI I DERGESES')
      && headers.includes('DATA');
  });
  if (headerRowIndex < 0) return null;

  const headerRow = rawRows[headerRowIndex] || [];
  const typeRow = rawRows[headerRowIndex - 1] || [];
  const skipRowIndices = [];
  rawRows.forEach((row, index) => {
    const firstCell = normalizeMondayHeader(Array.isArray(row) ? row[0] : '');
    const normalizedCells = Array.isArray(row) ? row.map(normalizeMondayHeader) : [];
    // monday.com exports can contain a helper row that stores every dropdown
    // label as one huge comma-separated value. It is metadata, not board data.
    if (index > headerRowIndex && firstCell === 'TEST MOS SHKRUJ') {
      skipRowIndices.push(index);
      return;
    }
    if (index > headerRowIndex && firstCell === 'NEW GROUP') {
      skipRowIndices.push(index);
      return;
    }
    const secondCell = String(Array.isArray(row) ? row[1] || '' : '').trim();
    const fourthCell = String(Array.isArray(row) ? row[3] || '' : '').trim();
    if (
      index > headerRowIndex
      && !firstCell
      && secondCell
      && /^\d+(?:\.\d+)?$/.test(secondCell)
      && /\bto\b/i.test(fourthCell)
    ) {
      skipRowIndices.push(index);
      return;
    }
    // Grouped monday.com boards repeat the column header between groups.
    // These rows must not become tasks or selectable Status labels.
    if (
      index > headerRowIndex
      && firstCell === 'NAME'
      && normalizedCells.includes('STATUSI I DERGESES')
      && normalizedCells.includes('DATA')
    ) {
      skipRowIndices.push(index);
    }
  });

  return {
    headerRowIndex,
    dataStartRowIndex: headerRowIndex + 1,
    columns: headerRow.map((name, columnIndex) => ({
      name: String(name || '').trim(),
      type: getMondayExportColumnType(typeRow[columnIndex], name),
      options: getMondayStatusOptions(name),
    })),
    skipRowIndices,
  };
}

// Import a table from an Excel / CSV file
app.post('/api/tables/import-excel', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });

  // Use multer memoryStorage so we can parse the buffer directly
  const memUpload = multer({ storage: multer.memoryStorage() });
  memUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { workspaceId, tableName } = req.body;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    // Check workspace ownership
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [workspaceId]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0];
      
      // Convert to raw array for AI analysis
      const raw = [];
      worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const rowValues = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          rowValues.push(cell.value === undefined ? null : cell.value);
        });
        raw.push(rowValues);
      });

      console.log(`[Import Excel] Analyzing with Nexus Brain...`);
      let aiResult;
      const mondayResult = analyzeMondayExport(raw);
      try {
        aiResult = mondayResult || await analyzeExcelWithNexusBrain(raw);
        if (mondayResult) {
          console.log('[Import Excel] Detected monday.com export; using deterministic column mapping.');
        }
      } catch (aiErr) {
        console.warn(`[Nexus Brain] Analysis failed, falling back to basic detection:`, aiErr);
        // Fallback to basic detection if AI fails
        let headerIdx = 0;
        for (let i = 0; i < Math.min(raw.length, 20); i++) {
          const nonNull = (raw[i] || []).filter(c => c !== null && String(c).trim() !== '').length;
          if (nonNull >= 3) { headerIdx = i; break; }
        }
        aiResult = {
          headerRowIndex: headerIdx,
          dataStartRowIndex: headerIdx + 1,
          columns: (raw[headerIdx] || []).map(name => ({
            name: name ? String(name).trim() : 'Column',
            type: 'Text'
          })),
          skipRowIndices: []
        };
      }

      const { headerRowIndex, dataStartRowIndex, columns: aiColumns, skipRowIndices } = aiResult;
      const rawHeaderRow = raw[headerRowIndex] || [];

      // Build Columns and Extract Colors for Status/Dropdown
      const columns = [];
      const colMap = []; // internal tracking

      for (let i = 0; i < aiColumns.length; i++) {
        const aiCol = aiColumns[i];
        if (!aiCol.name) continue;

        // Find the index of this column in the actual worksheet
        // (AI might have returned a normalized name, so we find the best match)
        const excelColIdx = rawHeaderRow.findIndex(h => h && String(h).trim().toLowerCase() === aiCol.name.toLowerCase()) + 1; // 1-based for exceljs
        
        const colId = uuidv4();
        const col = {
          id: colId,
          name: aiCol.name,
          type: aiCol.type || 'Text',
          order: i,
          _excelColIdx: excelColIdx > 0 ? excelColIdx : (i + 1)
        };

        // If Status/Dropdown, scan rows for exact options and colors
        if (col.type === 'Status' || col.type === 'Dropdown' || col.type === 'Country') {
          const optionsMap = new Map(); // value -> color

          if (col.type === 'Status' && Array.isArray(aiCol.options)) {
            aiCol.options.forEach((option) => {
              if (option && typeof option.value === 'string') {
                optionsMap.set(option.value, option.color || '#4f8ef7');
              }
            });
          }
          
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= dataStartRowIndex) return; // skip headers
            if (skipRowIndices && skipRowIndices.includes(rowNumber - 1)) return;

            const cell = row.getCell(col._excelColIdx);
            const val = cell.value ? String(cell.value).trim() : null;
            if (val) {
              // Extract color if not already found for this value
              if (!optionsMap.has(val)) {
                let hexColor = getHexFromExcelColor(cell.fill?.fgColor);
                // If no color in file, use AI suggestion or default
                if (!hexColor && aiCol.options) {
                  const aiOpt = aiCol.options.find(o => o.value.toLowerCase() === val.toLowerCase());
                  hexColor = aiOpt ? aiOpt.color : '#4f8ef7';
                }
                optionsMap.set(val, hexColor || '#4f8ef7');
              }
            }
          });

          col.options = Array.from(optionsMap.entries()).map(([value, color]) => ({ value, color }));
        }

        columns.push(col);
        colMap.push(col);
      }

      // Create Table
      const tableId = uuidv4();
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const dbColumns = columns.map(({ _excelColIdx, ...rest }) => rest);
      await db.query(
        'INSERT INTO tables (id, name, workspace_id, columns, created_at, invite_code) VALUES ($1, $2, $3, $4, $5, $6)',
        [tableId, tableName || worksheet.name, workspaceId, JSON.stringify(dbColumns), new Date().toISOString(), inviteCode]
      );

      // Insert Row Data
      let rowCount = 0;
      for (let i = dataStartRowIndex + 1; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const actualIdx = i - 1;

        if (row.actualCellCount === 0) continue;
        if (skipRowIndices && skipRowIndices.includes(actualIdx)) continue;

        const values = {};
        let hasData = false;
        
        for (const col of colMap) {
          const cell = row.getCell(col._excelColIdx);
          let val = cell.value;
          
          // Handle formulas (extract result)
          if (val && typeof val === 'object' && 'result' in val) {
            val = val.result;
          }

          // Handle Rich Text
          if (val && val.richText) {
            val = val.richText.map(t => t.text).join('');
          }

          // Handle Hyperlinks
          if (val && val.text && val.hyperlink) {
            val = val.text;
          }
          
          if (val instanceof Date) {
            values[col.id] = val.toISOString();
          } else if (val !== null && val !== undefined) {
            values[col.id] = String(val).trim();
          } else {
            values[col.id] = null;
          }
          if (values[col.id]) hasData = true;
        }

        if (hasData) {
          values.order = rowCount;
          await db.query(
            'INSERT INTO rows (id, table_id, values) VALUES ($1, $2, $3)',
            [uuidv4(), tableId, JSON.stringify(values)]
          );
          rowCount++;
        }
      }

      console.log(`[Import Excel] Success. Built table with ${rowCount} rows.`);
      res.json({ tableId, tableName: tableName || worksheet.name, columns: dbColumns, rowCount });

    } catch (err) {
      console.error('[Import Excel Error]', err);
      res.status(500).json({ error: err.message });
    }
  });
});






// Per-table tasks endpoints

// Endpoint to get recent email updates (Activity Feed)
app.get('/api/email-updates', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    // 1. Get workspaces owned by this user
    const wsResult = await db.query('SELECT id FROM workspaces WHERE owner_id = $1', [req.user.id]);
    const userWorkspaceIds = wsResult.rows.map(ws => ws.id);
    if (userWorkspaceIds.length === 0) return res.json([]);

    // 2. Get tables belonging to those workspaces
    const tablesResult = await db.query('SELECT id FROM tables WHERE workspace_id = ANY($1)', [userWorkspaceIds]);
    const userTableIds = tablesResult.rows.map(t => t.id);
    if (userTableIds.length === 0) return res.json([]);

    // 3. Filter activity logs by those table IDs
    const logsResult = await db.query(
      `SELECT activity_logs.*, tables.columns AS table_columns
       FROM activity_logs
       LEFT JOIN tables ON tables.id = activity_logs.table_id
       WHERE activity_logs.table_id = ANY($1)
       ORDER BY activity_logs.timestamp DESC
       LIMIT 20`,
      [userTableIds]
    );
    // Map snake_case to camelCase for frontend consistency
    const mappedLogs = logsResult.rows.map(log => ({
      id: log.id,
      recipients: log.recipients,
      subject: log.subject,
      html: normalizeActivityHtml(
        log.html,
        Array.isArray(log.table_columns)
          ? log.table_columns
          : (() => {
              try { return JSON.parse(log.table_columns || "[]"); } catch { return []; }
            })()
      ),
      timestamp: log.timestamp,
      tableId: log.table_id,
      taskId: log.task_id,
      status: log.status,
      errorMessage: log.error_message,
      error_message: log.error_message,
    }));
    res.json(mappedLogs);
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});




app.use(errorHandler(logger));

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

const SKIP_NEXT_APP = process.env.SKIP_NEXT_APP === 'true';

bootstrap({
  app,
  handle,
  nextApp,
  server,
  port: PORT,
  skipNextApp: SKIP_NEXT_APP,
  beforeStart: () => startupMigrationPromise,
  logger,
}).catch((error) => {
  logger.error('server_bootstrap_failed', { error: error.message });
  process.exit(1);
});

startScheduledMessageJob({ db, sendNotification, logger });
