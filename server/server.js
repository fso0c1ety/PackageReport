// --- Task Order Endpoint for Drag-and-Drop ---
// (Endpoint is now placed at the end of the file, after all initialization)
console.log('Server process starting...');
process.on('exit', (code) => console.log(`Process exit with code: ${code}`));
const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const cors = require('cors');
const multer = require('multer');
const ExcelJS = require('exceljs');
const db = require('./db');
const authenticateToken = require('./middleware/authenticateToken');
const { sendEmail } = require('./mailer');
const { sendPushNotification } = require('./firebase');
const { sendNotification } = require('./notificationHelper');
const BUILD_COMMIT = process.env.RENDER_GIT_COMMIT || process.env.COMMIT_SHA || 'edc8e7463386ac815cb01ca7bdaa24346ba30c97';
const BUILD_DATE = '2026-03-28';

console.log(`[Build] Commit: ${BUILD_COMMIT}`);
console.log(`[Build] Date: ${BUILD_DATE}`);

// --- Production Database Auto-Repair ---
async function bootstrapProductionDb() {
    console.log('[DB-BOOTSTRAP] Checking schema integrity...');
    try {
        // 1. users table: Add fcm_tokens and profile columns
        await db.query(`
            ALTER TABLE public.users 
            ADD COLUMN IF NOT EXISTS fcm_tokens JSONB DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS phone TEXT,
            ADD COLUMN IF NOT EXISTS job_title TEXT,
            ADD COLUMN IF NOT EXISTS company TEXT;
        `);

        // 2. tables table: Add invite_code and shared_users
        await db.query(`
            ALTER TABLE tables 
            ADD COLUMN IF NOT EXISTS invite_code TEXT,
            ADD COLUMN IF NOT EXISTS shared_users JSONB DEFAULT '[]'::jsonb;
        `);

        // 3. rows table: Add created_by and created_at
        await db.query(`
            ALTER TABLE rows 
            ADD COLUMN IF NOT EXISTS created_by TEXT,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        `);

        // 4. activity_logs: Add status and error_message
        await db.query(`
            ALTER TABLE activity_logs 
            ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent',
            ADD COLUMN IF NOT EXISTS error_message TEXT;
        `);



        // 5. table_chats: Add sender_id and ensure attachment is JSONB
        await db.query(`
            ALTER TABLE table_chats ADD COLUMN IF NOT EXISTS sender_id TEXT;
            ALTER TABLE table_chats ADD COLUMN IF NOT EXISTS attachment JSONB;
            -- Ensure type is actually JSONB if it was already created as something else
            DO $$ 
            BEGIN 
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'table_chats' AND column_name = 'attachment' AND data_type <> 'jsonb') THEN
                    ALTER TABLE table_chats ALTER COLUMN attachment TYPE JSONB USING attachment::jsonb;
                END IF;
            END $$;
        `);

        // 6. uploaded_files table for persisting uploads
        await db.query(`
            CREATE TABLE IF NOT EXISTS uploaded_files (
                id TEXT PRIMARY KEY,
                filename TEXT UNIQUE,
                originalname TEXT,
                mimetype TEXT,
                size BIGINT,
                data BYTEA,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        console.log('[DB-BOOTSTRAP] Schema repair completed successfully.');
    } catch (err) {
        console.error('[DB-BOOTSTRAP] Error during schema repair:', err.message);
    }
}

// Global initialization
bootstrapProductionDb();


const http = require('http');
const { Server } = require("socket.io");
const dev = process.env.NODE_ENV !== 'production';
let nextApp;
let handle;

if (dev) {
    const next = require('next');
    nextApp = next({ dev });
    handle = nextApp.getRequestHandler();
}

const app = express();
const SHARED_UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const LEGACY_UPLOAD_DIR = path.join(__dirname, 'uploads');
const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://package-report.vercel.app';
const corsOrigins = [
  frontendUrl,
  'http://localhost:3000',
  'http://localhost:4000',
  'http://localhost',          // Default Android Capacitor origin
  'capacitor://localhost',      // Default iOS Capacitor origin
  'http://192.168.0.25:3000',
  'http://192.168.0.28:3000',   // Android Dev IP from Capacitor config
  'http://192.168.0.28:4000'    // Android Dev Backend IP
];

// Root endpoint handled by Next.js
// app.get('/', (req, res) => {
//   res.send('Backend is running!');
// });

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // ensure websocket is enabled
  pingTimeout: 60000,
  pingInterval: 25000
});

// --- Socket.IO Handlers ---
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);

  socket.on('join_table', (tableId) => {
    socket.join(tableId);
    console.log(`[Socket] Client ${socket.id} joined table: ${tableId}`);
  });
  
  // Board Chat Typing
  socket.on('typing_board', ({ tableId, user }) => {
    socket.to(tableId).emit('typing_board', { user });
  });

  socket.on('stop_typing_board', ({ tableId, user }) => {
    socket.to(tableId).emit('stop_typing_board', { user });
  });

  // Task Chat (Discussion) Typing
  socket.on('typing_task', ({ tableId, taskId, user }) => {
     socket.to(tableId).emit('typing_task', { taskId, user });
  });

  socket.on('stop_typing_task', ({ tableId, taskId, user }) => {
    socket.to(tableId).emit('stop_typing_task', { taskId, user });
  });
  
  socket.on('join_task', (taskId) => {
      socket.join(taskId);
  });
  
  socket.on('leave_task', (taskId) => {
      socket.leave(taskId);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
    // Cleanup user socket tracking
    for (const [userId, sockets] of userSockets.entries()) {
        if (sockets.has(socket.id)) {
            sockets.delete(socket.id);
            if (sockets.size === 0) userSockets.delete(userId);
            break;
        }
    }
  });

  // --- WebRTC Direct Call Signaling & Session Management ---
  const pendingOffers = new Map(); // Store active call offers for users who might be opening the app from a push
  const userSockets = new Map();   // userId -> Set of socket IDs for single-session enforcement

  socket.on('register_user', (userId) => {
    if (userId) {
      // Single Session Enforcement: Check if user already has other active sockets
      if (userSockets.has(userId) && userSockets.get(userId).size > 0) {
          console.log(`[Socket] Duplicate session detected for user ${userId}. Prompting new client.`);
          socket.emit('duplicate_session_check');
      }

      // Track this socket for the user
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId).add(socket.id);

      socket.join('user_' + userId);
      console.log(`[Socket] User ${userId} registered to room user_${userId}`);

      // Check if there's a pending call offer for this user
      if (pendingOffers.has(userId)) {
        const offerData = pendingOffers.get(userId);
        console.log(`[Socket] Sending pending call offer to user ${userId}`);
        socket.emit('call_offer', offerData);
      }
    }
  });

  socket.on('call_offer', async (data) => {
    // data: { targetId, callerId, offer, callerName, callerAvatar, isVideo }
    socket.to('user_' + data.targetId).emit('call_offer', data);

    // Persist the offer in case they are opening the app from a push
    pendingOffers.set(data.targetId, data);
    // Auto-cleanup after 60 seconds if no action taken
    setTimeout(() => {
        if (pendingOffers.get(data.targetId) === data) {
            pendingOffers.delete(data.targetId);
        }
    }, 60000);

    try {
        const { sendDirectNotification } = require('./notificationHelper');
        await sendDirectNotification(
            data.targetId,
            'Incoming Call',
            `${data.callerName || 'Someone'} is calling you via ${data.isVideo ? 'Video' : 'Audio'}.`,
            'incoming_call',
            {
                callerId: data.callerId,
                callerName: data.callerName,
                callerAvatar: data.callerAvatar,
                isVideo: data.isVideo
            }
        );
    } catch (err) {
        console.error('[Socket] Failed to send push notification for call_offer:', err);
    }
  });

  socket.on('call_answer', (data) => {
    // data: { targetId, answer }
    pendingOffers.delete(socket.rooms.has('user_' + data.targetId) ? data.targetId : null); // Simple cleanup
    socket.to('user_' + data.targetId).emit('call_answer', data);
  });

  socket.on('call_ice_candidate', (data) => {
    // data: { targetId, candidate }
    socket.to('user_' + data.targetId).emit('call_ice_candidate', data);
  });

  socket.on('call_end', (data) => {
    // data: { targetId }
    pendingOffers.delete(data.targetId);
    socket.to('user_' + data.targetId).emit('call_end', data);
  });

  socket.on('call_reject', (data) => {
    // data: { targetId }
    pendingOffers.delete(data.targetId);
    socket.to('user_' + data.targetId).emit('call_reject', data);
  });

  // Session Takeover Logic
  socket.on('confirm_takeover', (userId) => {
      console.log(`[Socket] User ${userId} confirmed takeover. Logging out other sessions.`);
      const sockets = userSockets.get(userId);
      if (sockets) {
          for (const sId of sockets) {
              if (sId !== socket.id) {
                  socket.to(sId).emit('force_logout');
              }
          }
          // Reset the set to only contain the current socket
          userSockets.set(userId, new Set([socket.id]));
      }
  });
});

// --- Database Schema Migrations ---
(async () => {
  try {
    await db.query(`
      ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS status TEXT;
      ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fcm_tokens JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title TEXT;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company TEXT;
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
    console.error('[DB] Schema migration error:', err);
  }
})();

// Enable CORS for all routes before anything else
app.use(cors());

// Enable JSON parsing for request bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  if (req.method === 'POST') {
      const bodyStr = req.body ? JSON.stringify(req.body) : '{}';
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip} body: ${(bodyStr || '{}').substring(0, 100)}`);
  } else {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
  }
  next();
});

app.get('/api/version', (req, res) => {
  res.json({
    commit: BUILD_COMMIT,
    date: BUILD_DATE,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Register people and automation routes at /api
const authRoute = require('./routes/auth');
const peopleRoute = require('./routes/people');
const automationRoute = require('./routes/automation');
const emailerRoute = require('./routes/emailer');
const friendsRoute = require('./routes/friends');
const chatsRoute = require('./routes/chats');

// const tableTasksRoute = require('./routes/tableTasks');
app.use('/api', authRoute);
app.use('/api', peopleRoute);
app.use('/api', automationRoute);
app.use('/api', emailerRoute);
app.use('/api', friendsRoute);
app.use('/api', chatsRoute);
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

// POST /api/upload - General purpose file upload (used by Board Chat and other components)
app.post('/api/upload', authenticateToken, (req, res) => {
  const memUpload = multer({ storage: multer.memoryStorage() });
  memUpload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('[Upload] Multer Error:', err);
      return res.status(500).json({ error: 'Multer upload error' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const fileId = uuidv4();
      const timestamp = Date.now();
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
      const filename = `${timestamp}-${Math.round(Math.random() * 1E9)}-${safeName}`;
      
      // 1. Save to Filesystem (Shared Upload Directory)
      const filePath = path.join(SHARED_UPLOAD_DIR, filename);
      fs.writeFileSync(filePath, req.file.buffer);

      // 2. Save to PostgreSQL database
      await db.query(
        'INSERT INTO uploaded_files (id, filename, originalname, mimetype, size, data, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        [fileId, filename, req.file.originalname, req.file.mimetype, req.file.size, req.file.buffer]
      );

      console.log(`[Upload] File saved: ${filename} (${req.file.size} bytes)`);

      // Return the expected metadata for the frontend
      res.json({
        id: fileId,
        url: `/uploads/${encodeURIComponent(filename)}`,
        name: req.file.originalname,
        originalName: req.file.originalname, // Fixed: ensure originalName is present
        type: req.file.mimetype,
        size: req.file.size
      });
    } catch (dbErr) {
      console.error('[Upload] Database Error:', dbErr);
      res.status(500).json({ error: 'Failed to persist file data' });
    }
  });
});

// Get complete user profile
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await db.query('SELECT id, name, email, avatar, phone, job_title, company FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { name, avatar, phone, job_title, company } = req.body;
  console.log('[PROFILE UPDATE] Incoming:', { userId: req.user.id, name, avatar, phone, job_title, company });
  try {
    const result = await db.query(
      'UPDATE users SET name = $1, avatar = $2, phone = $3, job_title = $4, company = $5 WHERE id = $6 RETURNING id, name, email, avatar, phone, job_title, company',
      [name, avatar, phone, job_title, company, req.user.id]
    );
    if (result.rows.length === 0) {
      console.error('[PROFILE UPDATE] No user updated for id:', req.user.id);
      return res.status(404).json({ error: 'User not found or not updated' });
    }
    const updatedUser = result.rows[0];
    console.log('[PROFILE UPDATE] Updated user:', updatedUser);
    res.json(updatedUser);
  } catch (err) {
    console.error('[PROFILE UPDATE] Error updating profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Nexus Brain (AI) Endpoint ---
app.post('/api/nexus/chat', authenticateToken, async (req, res) => {
    const { messages, systemPrompt, input } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('[Nexus Brain] API Key missing in environment');
        return res.status(500).json({ error: 'AI Service configuration missing' });
    }

    try {
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
                    ...messages,
                    { role: "user", content: input }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[OpenAI Error]', errorData);
            throw new Error(errorData.error?.message || 'OpenAI Request Failed');
        }

        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('[Nexus Brain Error]', err);
        res.status(500).json({ error: err.message });
    }
});

// Port is handled after route registration
const PORT = process.env.PORT || 4000;

// --- Workspace Endpoints ---

// List all workspaces for the authenticated user
app.get('/api/workspaces', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await db.query(`
      SELECT DISTINCT 
        w.*, 
        u.name as owner_name, 
        u.avatar as owner_avatar,
        COALESCE(
          (
            SELECT jsonb_agg(jsonb_build_object('id', um.id, 'name', um.name, 'avatar', um.avatar))
            FROM (
                SELECT DISTINCT (elem->>'userId') as uid
                FROM tables t2, jsonb_array_elements(t2.shared_users) elem
                WHERE t2.workspace_id = w.id
            ) distinct_users
            JOIN users um ON um.id = distinct_users.uid
            WHERE um.id != w.owner_id  -- Exclude owner from members list to avoid duplication
          ), 
          '[]'::jsonb
        ) as members
      FROM workspaces w
      JOIN users u ON w.owner_id = u.id
      LEFT JOIN tables t ON w.id = t.workspace_id
      WHERE w.owner_id = $1 OR EXISTS (SELECT 1 FROM jsonb_array_elements(t.shared_users) AS elem WHERE elem->>'userId' = $1)
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching workspaces:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single workspace by ID (if owned by user)
app.get('/api/workspaces/:workspaceId', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await db.query(`
      SELECT DISTINCT w.* 
      FROM workspaces w
      LEFT JOIN tables t ON w.id = t.workspace_id
      WHERE w.id = $1 AND (w.owner_id = $2 OR EXISTS (SELECT 1 FROM jsonb_array_elements(t.shared_users) AS elem WHERE elem->>'userId' = $2))
    `, [req.params.workspaceId, req.user.id]);
    const workspace = result.rows[0];
    if (!workspace) {
      return res.status(403).json({ error: 'Workspace not found or forbidden' });
    }
    res.json(workspace);
  } catch (err) {
    console.error('Error fetching workspace:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new workspace
app.post('/api/workspaces', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const newWorkspace = {
      id: uuidv4(),
      name: req.body.name || 'Untitled Workspace',
      owner_id: req.user.id
    };

    await db.query('INSERT INTO workspaces (id, name, owner_id) VALUES ($1, $2, $3)', [newWorkspace.id, newWorkspace.name, newWorkspace.owner_id]);

    const defaultTableId = uuidv4();
    const columns = [
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

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await db.query(
      'INSERT INTO tables (id, name, workspace_id, columns, created_at, invite_code) VALUES ($1, $2, $3, $4, $5, $6)',
      [defaultTableId, `${newWorkspace.name} Table`, newWorkspace.id, JSON.stringify(columns), Date.now(), inviteCode]
    );

    res.json(newWorkspace);
  } catch (err) {
    console.error('Error creating workspace:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a workspace (rename)
app.put('/api/workspaces/:workspaceId', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Workspace name is required' });
  }

  try {
    // Check ownership
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [req.params.workspaceId]);
    const workspace = wsResult.rows[0];

    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    if (workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Update name
    const result = await db.query(
      'UPDATE workspaces SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), req.params.workspaceId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating workspace:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Delete a workspace
app.delete('/api/workspaces/:workspaceId', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check ownership first
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [req.params.workspaceId]);
    const workspace = wsResult.rows[0];

    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    if (workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete workspace (cascading will handle tables and rows if set up in schema)
    await db.query('DELETE FROM workspaces WHERE id = $1', [req.params.workspaceId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting workspace:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leave a workspace (remove self from all shared tables in this workspace)
app.delete('/api/workspaces/:workspaceId/leave', authenticateToken, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const workspaceId = req.params.workspaceId;

    // fetch all tables in this workspace
    const tablesResult = await db.query('SELECT * FROM tables WHERE workspace_id = $1', [workspaceId]);
    const tables = tablesResult.rows;

    for (const table of tables) {
      if (Array.isArray(table.shared_users)) {
        // Filter out the user from shared_users
        // Handle both string IDs and object user structures
        const newSharedUsers = table.shared_users.filter(u => {
            const uId = typeof u === 'string' ? u : u.userId;
            return uId !== userId;
        });
        
        if (newSharedUsers.length !== table.shared_users.length) {
            await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(newSharedUsers), table.id]);
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error leaving workspace:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List tables for a workspace
app.get('/api/workspaces/:workspaceId/tables', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [req.params.workspaceId]);
    const workspace = wsResult.rows[0];
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    // Allow access if user is owner OR has at least one shared table in this workspace
    const isOwner = workspace.owner_id === req.user.id;
    const sharedTablesCount = await db.query(
      `SELECT COUNT(*) FROM tables WHERE workspace_id = $1 AND EXISTS (SELECT 1 FROM jsonb_array_elements(shared_users) AS elem WHERE elem->>'userId' = $2)`,
      [req.params.workspaceId, req.user.id]
    );
    const hasSharedTables = parseInt(sharedTablesCount.rows[0].count) > 0;

    if (!isOwner && !hasSharedTables) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const tablesResult = await db.query(
      `SELECT * FROM tables WHERE workspace_id = $1 AND ($2 = $3 OR EXISTS (SELECT 1 FROM jsonb_array_elements(shared_users) AS elem WHERE elem->>'userId' = $3))`,
      [req.params.workspaceId, workspace.owner_id, req.user.id]
    );
    res.json(tablesResult.rows);
  } catch (err) {
    console.error('Error fetching workspace tables:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a table for a workspace
app.post('/api/workspaces/:workspaceId/tables', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [req.params.workspaceId]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

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

    const newTable = {
      id: uuidv4(),
      name: req.body.name,
      workspace_id: req.params.workspaceId,
      columns: columns,
      created_at: Date.now()
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



// Helper to check table ownership (kept for potential internal use, but mostly replaced by SQL)
function getWorkspaceForTable(workspaces, table) {
  return workspaces.find(w => w.id === table.workspaceId);
}

app.patch('/api/tables/:tableId', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    const isOwner = workspace && workspace.owner_id === req.user.id;
    const isShared = table.shared_users && table.shared_users.includes(req.user.id);
    if (!isOwner && !isShared) return res.sendStatus(403);

    if (typeof req.body.name === 'string') {
      await db.query('UPDATE tables SET name = $1 WHERE id = $2', [req.body.name, req.params.tableId]);
      return res.json({ success: true, name: req.body.name });
    }
    res.status(400).json({ error: 'Missing or invalid name' });
  } catch (err) {
    console.error('Error patching table:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/tables/:tableId', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) return res.sendStatus(403);

    await db.query('DELETE FROM tables WHERE id = $1', [req.params.tableId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting table:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update table columns
app.put('/api/tables/:tableId/columns', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    const isOwner = workspace && workspace.owner_id === req.user.id;
    const isShared = table.shared_users && Array.isArray(table.shared_users) && table.shared_users.some(u => u.userId === req.user.id);
    if (!isOwner && !isShared) return res.sendStatus(403);

    await db.query('UPDATE tables SET columns = $1 WHERE id = $2', [JSON.stringify(req.body.columns), req.params.tableId]);
    res.json({ success: true, columns: req.body.columns });
  } catch (err) {
    console.error('Error updating columns:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} body:`, req.body);
  next();
});

// List all tables (filter by ownership / workspaceId)
app.get('/api/tables', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    if (req.query.workspaceId) {
      const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [req.query.workspaceId]);
      const workspace = wsResult.rows[0];
      if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

      const tablesResult = await db.query(`
        SELECT 
            t.*, 
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', r.id, 
                        'table_id', r.table_id, 
                        'values', r.values
                    )
                ) FILTER (WHERE r.id IS NOT NULL), 
                '[]'
            ) as tasks
        FROM tables t 
        LEFT JOIN rows r ON t.id = r.table_id 
        WHERE t.workspace_id = $1 AND ($2 = $3 OR EXISTS (SELECT 1 FROM jsonb_array_elements(t.shared_users) AS elem WHERE elem->>'userId' = $3))
        GROUP BY t.id
      `, [req.query.workspaceId, workspace.owner_id, req.user.id]);
      return res.json(tablesResult.rows);
    } else {
      // Return all tables in all workspaces owned by user, or tables explicitly shared with user
      const result = await db.query(`
        SELECT 
            t.*, 
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', r.id, 
                        'table_id', r.table_id, 
                        'values', r.values
                    )
                ) FILTER (WHERE r.id IS NOT NULL), 
                '[]'
            ) as tasks
        FROM tables t 
        JOIN workspaces w ON t.workspace_id = w.id 
        LEFT JOIN rows r ON t.id = r.table_id 
        WHERE w.owner_id = $1 OR t.shared_users @> $2::jsonb
        GROUP BY t.id
      `, [req.user.id, JSON.stringify([{ userId: req.user.id }])]);
      res.json(result.rows);
    }
  } catch (err) {
    console.error('Error fetching tables:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single table by ID
app.get('/api/tables/:tableId', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*, w.owner_id as workspace_owner_id, w.name as workspace_name
      FROM tables t
      JOIN workspaces w ON t.workspace_id = w.id
      WHERE t.id = $1 AND (w.owner_id = $2 OR EXISTS (SELECT 1 FROM jsonb_array_elements(t.shared_users) AS elem WHERE elem->>'userId' = $2))
    `, [req.params.tableId, req.user.id]);

    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found or forbidden' });
    res.json(table);
  } catch (err) {
    console.error('Error fetching table:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
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
      created_at: Date.now()
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
      try {
        aiResult = await analyzeExcelWithNexusBrain(raw);
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
        if (col.type === 'Status' || col.type === 'Dropdown') {
          const optionsMap = new Map(); // value -> color
          
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
        [tableId, tableName || worksheet.name, workspaceId, JSON.stringify(dbColumns), Date.now(), inviteCode]
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

// Share a table with another user
app.post('/api/tables/:tableId/share', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { userId, permission } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  const perm = (permission === 'admin') ? 'admin' : (permission === 'read' ? 'read' : 'edit');

  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    const isOwner = workspace && workspace.owner_id === req.user.id;
    const sharedUsersForCheck = table.shared_users || [];
    const callerShare = sharedUsersForCheck.find(u => u.userId === String(req.user.id));
    const isAdmin = callerShare && callerShare.permission === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only workspace owners and admins can share tables' });
    }

    const sharedUsers = table.shared_users || [];
    const existingIndex = sharedUsers.findIndex(u => u.userId === userId);
    if (existingIndex !== -1) {
      // User already shared: just update permission
      sharedUsers[existingIndex].permission = perm;
      await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(sharedUsers), req.params.tableId]);
      return res.json({ success: true, shared_users: sharedUsers, message: 'Permission updated' });
    } else {
      // User not shared: Send Invite Notification
      const notifId = uuidv4();
      await db.query(
        'INSERT INTO notifications (id, recipient_id, sender_id, type, data) VALUES ($1, $2, $3, $4, $5)',
        [notifId, userId, req.user.id, 'invite', JSON.stringify({ tableId: table.id, tableName: table.name, permission: perm })]
      );

      // Send Push Notification
      const userRes = await db.query('SELECT fcm_token FROM users WHERE id = $1', [userId]);
      const token = userRes.rows[0]?.fcm_token;
      if (token) {
         await sendPushNotification(
            [token],
            'Table Invite',
            `${req.user.name} requests you to share this table: ${table.name}`,
            { type: 'invite', notificationId: notifId, tableId: table.id }
         );
      }
      
      return res.json({ success: true, message: 'Invite sent to user' });
    }
  } catch (err) {
    console.error('Error sharing table:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all members of a table (Owner + Shared Users)
app.get('/api/tables/:tableId/members', authenticateToken, async (req, res) => {
  try {
    const accessQuery = `
      SELECT t.id, t.shared_users, w.owner_id
      FROM tables t
      JOIN workspaces w ON t.workspace_id = w.id
      WHERE t.id = $1 AND (w.owner_id = $2 OR EXISTS (SELECT 1 FROM jsonb_array_elements(t.shared_users) AS elem WHERE elem->>'userId' = $2))
    `;
    const accessRes = await db.query(accessQuery, [req.params.tableId, req.user.id]);
    
    if (accessRes.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const table = accessRes.rows[0];
    const ownerId = table.owner_id;
    const sharedUsers = table.shared_users ? table.shared_users.map(u => u.userId) : [];
    const memberIds = [...new Set([ownerId, ...sharedUsers])];
    
    const usersRes = await db.query('SELECT id, name, email, avatar FROM users WHERE id = ANY($1)', [memberIds]);
    
    const members = usersRes.rows.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true`,
      role: user.id === ownerId ? 'owner' : 'member'
    }));
    
    members.sort((a, b) => {
        if (a.role === 'owner') return -1;
        if (b.role === 'owner') return 1;
        return a.name.localeCompare(b.name);
    });
    
    res.json(members);
  } catch (err) {
    console.error('Error fetching table members:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users shared with a table
app.get('/api/tables/:tableId/shared-users', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only owners can manage shared users' });
    }

    const shared = table.shared_users || [];
    if (shared.length === 0) return res.json([]);

    const userIds = shared.map(u => u.userId);
    const usersResult = await db.query('SELECT id, name, email, avatar FROM users WHERE id = ANY($1)', [userIds]);

    const usersWithPerms = usersResult.rows.map(user => {
      const shareInfo = shared.find(s => s.userId === user.id);
      return { ...user, permission: shareInfo ? shareInfo.permission : 'read' };
    });

    res.json(usersWithPerms);
  } catch (err) {
    console.error('Error fetching shared users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a user from a shared table
app.delete('/api/tables/:tableId/share/:userId', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    
    // Authorization: Allow workspace owner OR the user removing themselves
    if ((!workspace || workspace.owner_id !== req.user.id) && req.user.id !== req.params.userId) {
      return res.status(403).json({ error: 'Only owners or the user themselves can remove shared access' });
    }

    const sharedUsers = table.shared_users || [];
    const filtered = sharedUsers.filter(u => u.userId !== req.params.userId);

    await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(filtered), req.params.tableId]);
    res.json({ success: true, shared_users: filtered });
  } catch (err) {
    console.error('Error removing shared user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get or Generate invite code for a table
app.post('/api/tables/:tableId/invite-code', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only workspace owners can manage invite codes' });
    }

    let inviteCode = table.invite_code;
    if (!inviteCode) {
      inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await db.query('UPDATE tables SET invite_code = $1 WHERE id = $2', [inviteCode, req.params.tableId]);
    }

    res.json({ invite_code: inviteCode });
  } catch (err) {
    console.error('Error managing invite code:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete invite code (Stop sharing via code)
app.delete('/api/tables/:tableId/invite-code', authenticateToken, async (req, res) => {
  try {
    const tableId = req.params.tableId;
    // Verify ownership
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [tableId]);
    const table = result.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });
    
    // Check workspace owner
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only workspace owners can stop sharing' });
    }

    await db.query('UPDATE tables SET invite_code = NULL, shared_users = \'[]\'::jsonb WHERE id = $1', [tableId]);
    res.json({ success: true, message: 'Sharing stopped and shared users removed' });
  } catch (err) {
    console.error('Error deleting invite code:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join a table using an invite code
app.post('/api/tables/join', authenticateToken, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: 'Invite code is required' });

    console.log(`[Join] User ${req.user.id} trying to join with code ${inviteCode}`);
    const result = await db.query('SELECT * FROM tables WHERE UPPER(invite_code) = $1', [inviteCode.toUpperCase()]);
    const table = result.rows[0];
    if (!table) {
      console.log(`[Join] Invalid invite code: ${inviteCode}`);
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    let sharedUsers = table.shared_users;
    if (!sharedUsers || !Array.isArray(sharedUsers)) {
      sharedUsers = [];
    }

    if (!sharedUsers.some(u => u.userId === req.user.id)) {
      sharedUsers.push({ userId: req.user.id, permission: 'edit' });
      await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(sharedUsers), table.id]);
      console.log(`[Join] User ${req.user.id} successfully added to table ${table.id}`);
    } else {
      console.log(`[Join] User ${req.user.id} already in shared_users for table ${table.id}`);
    }

    res.json({ success: true, tableId: table.id, workspaceId: table.workspace_id });
  } catch (err) {
    console.error('Error joining table:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all collaborators (teammates) assigned to the current user's owned tables
app.get('/api/teammates', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      WITH      owned_tables AS (
          SELECT t.id, t.name as table_name, t.shared_users, w.name as workspace_name
          FROM tables t
          JOIN workspaces w ON t.workspace_id = w.id
          WHERE w.owner_id = $1
      ),
      all_collaborators AS (
          -- Collaborators on my tables
          SELECT 
            (elem->>'userId') as user_id, 
            'joined' as status, 
            ot.id as table_id, 
            ot.table_name, 
            ot.workspace_name, 
            (elem->>'permission') as permission
          FROM owned_tables ot
          CROSS JOIN LATERAL jsonb_array_elements(ot.shared_users) AS elem
          UNION ALL
          -- Pending invites sent by me
          SELECT 
            n.recipient_id::text as user_id, 
            'pending' as status, 
            NULL as table_id, 
            NULL as table_name, 
            NULL as workspace_name, 
            'edit' as permission
          FROM notifications n
          WHERE n.sender_id = $1 AND n.type = 'invite'
      ),
      unique_collaborators AS (
          SELECT 
            user_id, 
            MIN(status) as status,
            jsonb_agg(
              jsonb_build_object(
                'tableId', table_id,
                'tableName', table_name,
                'workspaceName', workspace_name,
                'permission', permission
              )
            ) FILTER (WHERE table_id IS NOT NULL) as access
          FROM all_collaborators
          WHERE user_id != $1::text
          GROUP BY user_id
      )
      SELECT u.id, u.name, u.email, u.avatar, uc.status, uc.access
      FROM users u
      JOIN unique_collaborators uc ON u.id::text = uc.user_id
    `;
    const result = await db.query(query, [userId]);
    
    const teammates = result.rows.map(user => ({
      ...user,
      avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true`
    }));

    res.json(teammates);
  } catch (err) {
    console.error('Error fetching teammates:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a teammate from all tables owned by the current user
app.delete('/api/teammates/:teammateId', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const teammateId = req.params.teammateId;
  
    try {
      // 1. Find all tables owned by the current user
      const ownedTablesRes = await db.query(`
        SELECT t.id, t.shared_users
        FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id
        WHERE w.owner_id = $1
      `, [userId]);
  
      for (const table of ownedTablesRes.rows) {
        if (table.shared_users && Array.isArray(table.shared_users)) {
          const newSharedUsers = table.shared_users.filter(u => u.userId !== teammateId);
          if (newSharedUsers.length !== table.shared_users.length) {
            await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(newSharedUsers), table.id]);
          }
        }
      }
  
      // 2. Remove pending invites
      await db.query('DELETE FROM notifications WHERE sender_id = $1 AND recipient_id = $2 AND type = \'invite\'', [userId, teammateId]);
  
      res.json({ success: true });
    } catch (err) {
      console.error('Error removing teammate:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// Update teammate permission across all owned tables
app.put('/api/teammates/:teammateId/permission', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const teammateId = req.params.teammateId;
    const { permission } = req.body;
    
    if (!['read', 'edit', 'admin'].includes(permission)) {
        return res.status(400).json({ error: 'Invalid permission' });
    }
  
    try {
      // 1. Find all tables owned by the current user
      const ownedTablesRes = await db.query(`
        SELECT t.id, t.shared_users
        FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id
        WHERE w.owner_id = $1
      `, [userId]);
  
      for (const table of ownedTablesRes.rows) {
        if (table.shared_users && Array.isArray(table.shared_users)) {
          let modified = false;
          const newSharedUsers = table.shared_users.map(u => {
            if (u.userId === teammateId) {
                modified = true;
                return { ...u, permission };
            }
            return u;
          });
          
          if (modified) {
            await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(newSharedUsers), table.id]);
          }
        }
      }
  
      res.json({ success: true });
    } catch (err) {
      console.error('Error updating teammate permission:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
});

// Update teammate permission for a specific board
app.put('/api/tables/:tableId/teammates/:teammateId/permission', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { tableId, teammateId } = req.params;
    const { permission } = req.body;
    
    if (!['read', 'edit', 'admin'].includes(permission)) {
        return res.status(400).json({ error: 'Invalid permission' });
    }
  
    try {
      // Verify ownership
      const tableRes = await db.query(`
        SELECT t.id, t.shared_users
        FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id
        WHERE t.id = $1 AND w.owner_id = $2
      `, [tableId, userId]);
  
      if (tableRes.rows.length === 0) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      const table = tableRes.rows[0];
      if (table.shared_users && Array.isArray(table.shared_users)) {
          const newSharedUsers = table.shared_users.map(u => {
            if (u.userId === teammateId) {
                return { ...u, permission };
            }
            return u;
          });
          
          await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(newSharedUsers), tableId]);
      }
  
      res.json({ success: true });
    } catch (err) {
      console.error('Error updating granular teammate permission:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
});




// Per-table tasks endpoints

// Get all tasks for a table
app.get('/api/tables/:tableId/tasks', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM rows WHERE table_id = $1 ORDER BY (values->>'order')::int ASC NULLS FIRST, created_at DESC",
      [req.params.tableId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific task by ID for a table
app.get('/api/tables/:tableId/tasks/:taskId', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM rows WHERE id = $1 AND table_id = $2', [req.params.taskId, req.params.tableId]);
    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(row);
  } catch (err) {
    console.error('Error fetching task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tables/:tableId/tasks', authenticateToken, async (req, res) => {
  try {
    const newTask = { 
        id: uuidv4(), 
        table_id: req.params.tableId, 
        values: req.body.values || {},
        created_by: req.user.id
    };
    
    await db.query(
      'INSERT INTO rows (id, table_id, values, created_by, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [newTask.id, newTask.table_id, JSON.stringify(newTask.values), newTask.created_by]
    );
    console.log(`Task created for table ${req.params.tableId}:`, newTask);
    res.status(201).json(newTask);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update document content
app.put('/api/tables/:tableId/doc', async (req, res) => {
  try {
    await db.query('UPDATE tables SET doc_content = $1 WHERE id = $2', [req.body.content, req.params.tableId]);
    res.json({ success: true, content: req.body.content });
  } catch (err) {
    console.error('Error updating document content:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/tables/:tableId/tasks', authenticateToken, async (req, res) => {
  const debugLogs = [];
  const log = (msg, obj) => {
    console.log(msg, obj);
    debugLogs.push({ msg, obj });
  };

  try {
    const { id, values } = req.body;
    if (!id || typeof values !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // 1. Get existing task and table
    const tableResult = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = tableResult.rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const rowResult = await db.query('SELECT * FROM rows WHERE id = $1 AND table_id = $2', [id, req.params.tableId]);
    const row = rowResult.rows[0];
    if (!row) return res.status(404).json({ error: 'Task not found' });

    const oldValues = row.values || {};
    const newValues = values || {};
    const timestamp = new Date().toISOString();
    const newActivity = [];
    const oldActivity = oldValues.activity || [];

    // --- Notification Logic ---
    // (Helper function imported from notificationHelper.js)

    // Detect Task Chat (Discussion)
    if (newValues.message && Array.isArray(newValues.message)) {
        const oldLen = (oldValues.message && Array.isArray(oldValues.message)) ? oldValues.message.length : 0;
        if (newValues.message.length > oldLen) {
            const lastMsg = newValues.message[newValues.message.length - 1];
            
            // Check Schedule
            const isScheduled = lastMsg.scheduledFor && new Date(lastMsg.scheduledFor) > new Date();
            // Mark validation
            lastMsg.notificationSent = !isScheduled;

            if (isScheduled) {
                console.log(`[Task] Message scheduled for ${lastMsg.scheduledFor}`);
            } else {
                // Find task name
                let taskName = 'Task';
                if (table.columns && Array.isArray(table.columns)) {
                    const taskCol = table.columns.find(c => c.id === 'task') || table.columns[0];
                    if (taskCol && newValues[taskCol.id]) {
                        taskName = newValues[taskCol.id];
                    }
                } else if (newValues['task']) {
                    taskName = newValues['task'];
                }
                
                const userName = lastMsg.sender || (req.user ? req.user.name : 'User');
                
                // Format: "{Users Name} commented on the {Tasks name}: (The message)"
                try {
                    await sendNotification(
                        'New Discussion', 
                        `${userName} commented on the ${taskName}: ${lastMsg.text}`,
                        'task_chat',
                        { taskId: id },
                        table,
                        req.user ? req.user.id : null
                    );
                } catch (notifyErr) {
                    console.error('[Task Chat] Failed to send notification, continuing with task update:', notifyErr);
                }
            }
        }
    }

    // Detect File Comments
    const columns = table.columns || [];
    if (Array.isArray(columns)) {
        for (const col of columns) {
            if (col.type === 'Files' || col.type === 'File') { // Handle both types
                const oldFiles = oldValues && oldValues[col.id] && Array.isArray(oldValues[col.id]) ? oldValues[col.id] : [];
                const newFiles = newValues && newValues[col.id] && Array.isArray(newValues[col.id]) ? newValues[col.id] : [];
                
                for (const nFile of newFiles) {
                    const oFile = oldFiles.find(o => o.url === nFile.url); // Match by URL
                    if (oFile && nFile.comments && Array.isArray(nFile.comments)) {
                        const oldCommentsLen = (oFile.comments && Array.isArray(oFile.comments)) ? oFile.comments.length : 0;
                        if (nFile.comments.length > oldCommentsLen) {
                            const lastComment = nFile.comments[nFile.comments.length - 1];
                            const userName = lastComment.user || (req.user ? req.user.name : 'User');
                            const fileName = nFile.name || 'File';
                            
                            // Format: "{Users Name} commented on the {file name}: (The Comment)"
                            try {
                                await sendNotification(
                                    'New File Comment',
                                    `${userName} commented on the ${fileName}: ${lastComment.text}`,
                                    'file_comment',
                                    { taskId: id },
                                    table,
                                    req.user ? req.user.id : null
                                );
                            } catch (notifyErr) {
                                console.error('[File Comment] Failed to send notification, continuing with task update:', notifyErr);
                            }
                        }
                    }
                }
            }
        }
    }
    // --- End Notification Logic ---

    // 2. Detect changes for activity logging
    Object.keys(newValues).forEach(key => {
      if (key === 'message' || key === 'activity') return;

      const oldVal = oldValues[key];
      const newVal = newValues[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        const columns = table.columns || [];
        const col = columns.find(c => c.id === key);
        const colName = col ? col.name : key;

        let logText = `Updated ${colName}`;
        if (newVal !== null && typeof newVal !== 'object') {
          logText += ` to "${newVal}"`;
        }

        newActivity.push({ text: logText, time: timestamp, user: "User" });
      }
    });

    // 3. Update task in database
    const mergedValues = { ...oldValues, ...newValues };
    if (newActivity.length > 0) {
      mergedValues.activity = [...newActivity, ...oldActivity];
    } else {
      mergedValues.activity = oldActivity;
    }

    await db.query('UPDATE rows SET values = $1 WHERE id = $2', [JSON.stringify(mergedValues), id]);

    // 4. Automation Logic
    // Prioritize task-specific automation over table-level
    // (Updated to support task_ids array and action_type)
    const autoResult = await db.query(
      `SELECT * FROM automations 
       WHERE table_id = $1 
         AND enabled = true 
         AND (
           task_ids IS NULL 
           OR jsonb_array_length(task_ids) = 0 
           OR task_ids @> jsonb_build_array($2::text)
         )
       ORDER BY id ASC`, 
      [req.params.tableId, id]
    );

    console.log(`[AUTOMATION] Found ${autoResult.rows.length} matching automation(s) for task ${id}`);

    for (const automation of autoResult.rows) {
      if (automation && automation.trigger_col) {
        const triggerCol = automation.trigger_col;
        console.log(`[AUTOMATION] Checking trigger "${triggerCol}":`, {
          old: oldValues[triggerCol],
          new: newValues[triggerCol]
        });
        if (oldValues[triggerCol] !== newValues[triggerCol]) {
          // Trigger automation...
          const subject = `Task updated: ${table.name}`;

          let htmlRows = '';
          let textSummaryLines = [];
          const columns = table.columns || [];
          const automationCols = automation.cols || [];

          automationCols.forEach(colId => {
            const col = columns.find(c => c.id === colId);
            if (col) {
              let val = newValues[colId];
              if (typeof val === 'object' && val !== null) {
                val = JSON.stringify(val);
              }
              // Build HTML
              htmlRows += `
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 14px; font-weight: 500; width: 40%; vertical-align: top;">${col.name}</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 600; vertical-align: top;">${val || '-'}</td>
                </tr>
              `;
              
              // Build Text Summary (for Notifications)
              textSummaryLines.push(`${col.name}: ${val || '-'}`);
            }
          });

          // Join lines for notification body
          const textSummary = textSummaryLines.length > 0 ? textSummaryLines.join('\n') : 'Check task for details.';

          const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px 20px; background-color: #f3f4f6; color: #111827;">
  <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #2563eb; padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.025em;">Smart Manage</h1>
    </div>
    <div style="padding: 40px 32px;">
      <h2 style="margin-top: 0; color: #1f2937; font-size: 22px; font-weight: 600; margin-bottom: 16px;">Task Updated</h2>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
        An update occurred in the <strong style="color: #2563eb;">${table.name}</strong> table. The recorded changes are listed below:
      </p>
      
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; background-color: #fafafa;">
          <tbody>
            ${htmlRows}
          </tbody>
        </table>
      </div>
      
      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
          This is an automated notification from your <strong>Smart Manage</strong> workspace.
        </p>
      </div>
    </div>
  </div>
</div>
          `;

          const recipients = automation.recipients || [];
          const actionType = automation.action_type || 'email';

          if (recipients.length > 0) {
            
            console.log(`[AUTOMATION] Triggering '${actionType}' for recipients:`, recipients);

            // Create activity log entry (Pending) - Logs for ALL types now
            const logRes = await db.query(
              'INSERT INTO activity_logs (recipients, subject, html, timestamp, table_id, task_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
              [JSON.stringify(recipients), subject, html, Date.now(), table.id, id, 'pending']
            );
            const logId = logRes.rows[0].id;

            (async () => {
              try {
                let successEmail = true;
                let successNotif = true;
                let errorMessages = [];

                // 1. EMAIL LOGIC
                if (actionType === 'email' || actionType === 'both') {
                  try {
                    console.log('[AUTOMATION] Sending email...');
                    await sendEmail({
                      to: recipients,
                      subject,
                      html
                    });
                  } catch (mailErr) {
                    successEmail = false;
                    console.error('[AUTOMATION] Failed to send email:', mailErr);
                    errorMessages.push(`Email: ${mailErr.message || mailErr}`);
                  }
                }

                // 2. NOTIFICATION LOGIC
                if (actionType === 'notification' || actionType === 'both') {
                     try {
                         console.log('[AUTOMATION] Sending notification...');
                         
                         // Fetch users with their FCM tokens
                         const userRes = await db.query('SELECT id, email, fcm_token, fcm_tokens FROM users WHERE email = ANY($1)', [recipients]);
                         const matchedUsers = userRes.rows;
                         
                         if (matchedUsers.length === 0) {
                            console.warn('[AUTOMATION] No matching users found via email for notification.');
                         }
        
                         const fcmTokens = new Set();
        
                         for (const u of matchedUsers) {
                             // Add to internal notifications table (shows in top bar)
                             await db.query(`
                                 INSERT INTO notifications (id, recipient_id, sender_id, type, data, read, created_at)
                                 VALUES ($1, $2, $3, $4, $5, $6, NOW())
                             `, [uuidv4(), u.id, null, 'automation', {
                                 subject: subject,
                                 body: textSummary, // Pass details for UI if needed
                                 tableName: table.name,
                                 tableId: table.id,
                                 taskId: id,
                                 logId: logId
                             }, false]);
        
                             // Collect FCM tokens for push notification
                             if (u.fcm_token) fcmTokens.add(u.fcm_token);
                             if (Array.isArray(u.fcm_tokens)) {
                                 u.fcm_tokens.forEach(t => { if (t) fcmTokens.add(t); });
                             }
                         }
                         
                         const tokensArray = Array.from(fcmTokens);
        
                         // Send Push Notifications via Firebase
                         if (tokensArray.length > 0) {
                           const pushTitle = subject;
                           const pushBody = textSummary || "Task updated.";
                           const pushData = {
                             type: 'automation',
                             tableId: table.id.toString(),
                             workspaceId: table.workspace_id,
                             taskId: id.toString()
                           };
                           await sendPushNotification(tokensArray, pushTitle, pushBody, pushData);
                           console.log('[AUTOMATION] Sent push notifications with details to', tokensArray.length, 'devices.');
                         }
                     } catch (pushErr) {
                         successNotif = false;
                         console.error('[AUTOMATION] Failed to send notifications:', pushErr);
                         errorMessages.push(`Notification: ${pushErr.message || pushErr}`);
                     }
                }

                // Update activity log status
                let finalStatus = 'sent';
                if (!successEmail || !successNotif) {
                  finalStatus = 'error'; 
                } else if (errorMessages.length > 0) {
                   // e.g. partial failure
                   finalStatus = 'error';
                }
                
                const finalErrorMsg = errorMessages.length > 0 ? errorMessages.join('; ') : null;
                
                await db.query('UPDATE activity_logs SET status = $1, error_message = $2 WHERE id = $3', [finalStatus, finalErrorMsg, logId]);
                
              } catch (critErr) {
                 console.error('[AUTOMATION] Critical error in async execution:', critErr);
                 await db.query('UPDATE activity_logs SET status = $1, error_message = $2 WHERE id = $3', ['error', 'Critical execution failure', logId]);
              }
            })();
          }
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/tables/:tableId/tasks/:taskId', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM rows WHERE id = $1 AND table_id = $2', [req.params.taskId, req.params.tableId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get recent email updates (Activity Feed)
app.get('/api/email-updates', authenticateToken, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    // 1. Get workspaces owned by this user
    const wsResult = await db.query('SELECT id FROM workspaces WHERE owner_id = $1', [req.user.id]);
    const userWorkspaceIds = wsResult.rows.map(ws => ws.id);
    console.log(`[ACTIVITY] User ${req.user.id} has workspaces:`, userWorkspaceIds);

    if (userWorkspaceIds.length === 0) return res.json([]);

    // 2. Get tables belonging to those workspaces
    const tablesResult = await db.query('SELECT id FROM tables WHERE workspace_id = ANY($1)', [userWorkspaceIds]);
    const userTableIds = tablesResult.rows.map(t => t.id);
    console.log(`[ACTIVITY] User ${req.user.id} has tables:`, userTableIds);

    if (userTableIds.length === 0) return res.json([]);

    // 3. Filter activity logs by those table IDs
    const logsResult = await db.query(
      'SELECT * FROM activity_logs WHERE table_id = ANY($1) ORDER BY timestamp DESC LIMIT 20',
      [userTableIds]
    );
    // Map snake_case to camelCase for frontend consistency
    const mappedLogs = logsResult.rows.map(log => ({
      id: log.id,
      recipients: log.recipients,
      subject: log.subject,
      html: log.html,
      timestamp: log.timestamp,
      tableId: log.table_id,
      taskId: log.task_id,
      status: log.status,
      errorMessage: log.error_message
    }));
    res.json(mappedLogs);
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// --- Task Order Endpoint for Drag-and-Drop ---
app.put('/api/tables/:tableId/tasks/order', async (req, res) => {
  const { orderedTaskIds } = req.body;
  if (!Array.isArray(orderedTaskIds)) {
    return res.status(400).json({ error: 'orderedTaskIds must be array' });
  }

  try {
    // In PostgreSQL, we'll store order as a property in the values JSONB or as a separate column.
    // Given the current schema, let's update the 'values' JSONB to include 'order'.
    for (let i = 0; i < orderedTaskIds.length; i++) {
      const taskId = orderedTaskIds[i];
      // We need to merge the new order into existing values
      await db.query(`
            UPDATE rows 
            SET values = jsonb_set(COALESCE(values, '{}'::jsonb), '{order}', $1::jsonb)
            WHERE id = $2 AND table_id = $3
        `, [JSON.stringify(i), taskId, req.params.tableId]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error ordering tasks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// --- User FCM Token Endpoint ---
app.put('/api/users/fcm', authenticateToken, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });
  try {
    console.log('[FCM] PUT /api/users/fcm called');
    console.log('User from token:', req.user);
    console.log('Token in body:', token);
    // 1. Update the singular field (for backward compatibility)
    await db.query('UPDATE public.users SET fcm_token = $1 WHERE id = $2', [token, req.user.id]);
    console.log('Updated fcm_token for user', req.user.id);
    // 2. Best-effort update of the plural array for multi-device support.
    // Older production databases may not have this column yet, so we avoid failing the whole request.
    let updatedPluralTokens = false;
    try {
      await db.query(`
          UPDATE public.users
          SET fcm_tokens = CASE
              WHEN fcm_tokens IS NULL THEN jsonb_build_array($1::text)
              WHEN jsonb_typeof(fcm_tokens) <> 'array' THEN jsonb_build_array($1::text)
              WHEN NOT (fcm_tokens @> jsonb_build_array($1::text)) THEN fcm_tokens || jsonb_build_array($1::text)
              ELSE fcm_tokens
          END
          WHERE id = $2
      `, [token, req.user.id]);
      updatedPluralTokens = true;
      console.log('Updated fcm_tokens for user', req.user.id);
    } catch (pluralErr) {
      console.warn('[FCM] Non-fatal error updating fcm_tokens:', pluralErr.message);
    }
    res.json({ success: true, storedInArray: updatedPluralTokens });
  } catch (err) {
    console.error('Error updating FCM token:', err);
    if (err.stack) console.error(err.stack);
    res.status(500).json({
      error: 'Internal server error',
      message: err && err.message ? err.message : null,
      stack: err && err.stack ? err.stack : null,
      full: JSON.stringify(err)
    });
  }
});

app.delete('/api/users/fcm', authenticateToken, async (req, res) => {
  try {
    await db.query('UPDATE public.users SET fcm_token = NULL WHERE id = $1', [req.user.id]);
    try {
      await db.query('UPDATE public.users SET fcm_tokens = \'[]\'::jsonb WHERE id = $1', [req.user.id]);
    } catch (pluralErr) {
      console.warn('[FCM] Non-fatal error clearing fcm_tokens:', pluralErr.message);
    }
    console.log(`[FCM] Cleared tokens for user ${req.user.id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error clearing FCM token:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Test Notification Endpoint ---
app.post('/api/test-notification', authenticateToken, async (req, res) => {
    try {
        const userRes = await db.query('SELECT fcm_token, fcm_tokens FROM users WHERE id = $1', [req.user.id]);
        if (userRes.rows.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }
        
        const r = userRes.rows[0];
        let tokens = new Set();
        if (r.fcm_token) tokens.add(r.fcm_token);
        if (Array.isArray(r.fcm_tokens)) {
            r.fcm_tokens.forEach(t => { if (t) tokens.add(t); });
        }
        const tokensArray = Array.from(tokens);

        if (tokensArray.length === 0) {
            return res.status(400).json({ error: 'No FCM tokens found for user' });
        }
        
        console.log(`Sending test notification to user ${req.user.id} with ${tokensArray.length} tokens...`);
        await sendPushNotification(tokensArray, 'Test Notification', 'This is a test from SmartManage!');
        res.json({ success: true, message: 'Notification sent' });
    } catch (err) {
        console.error('Error sending test notification:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Table Chat Endpoints ---
// Using a table in PostgreSQL for chats
app.get('/api/tables/:tableId/chat', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT tc.*, u.avatar as sender_avatar 
      FROM table_chats tc 
      LEFT JOIN users u ON tc.sender_id = u.id 
      WHERE tc.table_id = $1 
      ORDER BY tc.timestamp ASC
    `, [req.params.tableId]);
    const normalizedRows = result.rows.map((row) => {
      let attachment = row.attachment;

      if (typeof attachment === 'string') {
        try {
          attachment = JSON.parse(attachment);
        } catch {
          attachment = null;
        }
      }

      return {
        ...row,
        attachment: attachment && typeof attachment === 'object' ? attachment : null
      };
    });

    res.json(normalizedRows);
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// --- Notification Routes ---

// Get unread notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    // Simplified query to avoid UUID casting errors
    const result = await db.query(`
      SELECT n.*, u.name as sender_name, u.avatar as sender_avatar
      FROM notifications n
      LEFT JOIN users u ON n.sender_id = u.id
      WHERE n.recipient_id = $1 
      ORDER BY n.read ASC, n.created_at DESC 
      LIMIT 50
    `, [req.user.id]);
    
    // Enrich with workspaceId
    const notifications = await Promise.all(result.rows.map(async (n) => {
        const data = n.data || {};
        
        // If workspaceId is missing but tableId is present, try to fetch workspaceId
        if (!data.workspaceId && data.tableId) {
            try {
                // Check if tableId is a valid UUID before querying
                if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.tableId)) {
                    const tableRes = await db.query('SELECT workspace_id FROM tables WHERE id = $1', [data.tableId]);
                    if (tableRes.rows.length > 0) {
                        data.workspaceId = tableRes.rows[0].workspace_id;
                    }
                }
            } catch (ignore) {
                // Ignore query errors, just return data as is
            }
        }
        
        return { ...n, data };
    }));

    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
app.post('/api/notifications/mark-read', authenticateToken, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET read = true WHERE recipient_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notifications read:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept Invite
app.post('/api/notifications/:id/accept', authenticateToken, async (req, res) => {
  try {
    const notifResult = await db.query('SELECT * FROM notifications WHERE id = $1 AND recipient_id = $2', [req.params.id, req.user.id]);
    const notification = notifResult.rows[0];
    
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    if (notification.type !== 'invite') return res.status(400).json({ error: 'Not an invite' });

    const { tableId, permission } = notification.data || {};
    
    if (!tableId) return res.status(400).json({ error: 'Invalid invite data' });

    // Add user to table
    const tableResult = await db.query('SELECT * FROM tables WHERE id = $1', [tableId]);
    const table = tableResult.rows[0];

    if (table) {
      let sharedUsers = table.shared_users;
      if (!Array.isArray(sharedUsers)) sharedUsers = [];
      
      // Check if already shared
      if (!sharedUsers.some(u => u.userId === req.user.id)) {
        sharedUsers.push({ userId: req.user.id, permission: permission || 'edit' });
        await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(sharedUsers), tableId]);
      }
    }

    // Delete notification after action
    await db.query('DELETE FROM notifications WHERE id = $1', [req.params.id]);

    res.json({ success: true, message: 'Invite accepted' });
  } catch (err) {
    console.error('Error accepting invite:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Decline Invite (Delete notification)
app.post('/api/notifications/:id/decline', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM notifications WHERE id = $1 AND recipient_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Invite declined' });
  } catch (err) {
    console.error('Error declining invite:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invite to table endpoint
app.post('/api/tables/:tableId/invite', authenticateToken, async (req, res) => {
    const { tableId } = req.params;
    const { recipientId, permission } = req.body;
    if (!recipientId) return res.status(400).json({ error: 'Recipient ID is required' });

    try {
        const tableRes = await db.query('SELECT name FROM tables WHERE id = $1', [tableId]);
        if (tableRes.rows.length === 0) return res.status(404).json({ error: 'Table not found' });
        
        await createInviteNotification(recipientId, req.user.id, tableId, tableRes.rows[0].name, permission || 'edit');
        res.json({ success: true, message: 'Invite sent' });
    } catch (err) {
        console.error('Error sending invite:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper for invite notifications
const createInviteNotification = async (recipientId, senderId, tableId, tableName, permission) => {
    const notifDisplayId = uuidv4();
    await db.query(
        'INSERT INTO notifications (id, recipient_id, sender_id, type, data) VALUES ($1, $2, $3, $4, $5)',
        [notifDisplayId, recipientId, senderId, 'invite', JSON.stringify({ tableId, tableName, permission })]
    );
    
    // Also send Push Notification
    const userRes = await db.query('SELECT fcm_token FROM users WHERE id = $1', [recipientId]);
    const token = userRes.rows[0]?.fcm_token;
    if (token) {
        // Fetch sender name
        const senderRes = await db.query('SELECT name FROM users WHERE id = $1', [senderId]);
        const senderName = senderRes.rows[0]?.name || 'Someone';
        
        await sendPushNotification(
            [token],
            'Table Invite',
            `${senderName} requests you to share this table: ${tableName}`,
            { type: 'invite', notificationId: notifDisplayId }
        );
    }
};

app.post('/api/tables/:tableId/chat', authenticateToken, async (req, res) => {
  try {
    const normalizedAttachment = req.body.attachment && typeof req.body.attachment === 'object'
      ? {
          name: req.body.attachment.name || null,
          type: req.body.attachment.type || null,
          url: req.body.attachment.url || null,
          size: req.body.attachment.size || null,
          originalName: req.body.attachment.originalName || null,
          uploadedAt: req.body.attachment.uploadedAt || null
        }
      : null;

    const newMessage = {
      id: uuidv4(),
      table_id: req.params.tableId,
      sender: req.body.sender || req.user.name,
      sender_id: req.user.id,
      text: req.body.text,
      timestamp: req.body.timestamp || Date.now(),
      attachment: normalizedAttachment
    };

    await db.query(
      'INSERT INTO table_chats (id, table_id, sender, text, timestamp, attachment, sender_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        newMessage.id,
        newMessage.table_id,
        newMessage.sender,
        newMessage.text,
        newMessage.timestamp,
        newMessage.attachment ? JSON.stringify(newMessage.attachment) : null,
        newMessage.sender_id
      ]
    );

    // Fetch sender avatar for the socket event
    const userRes = await db.query('SELECT avatar FROM users WHERE id = $1', [newMessage.sender_id]);
    newMessage.sender_avatar = userRes.rows[0]?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(newMessage.sender)}&background=random&color=fff&bold=true`;
    newMessage.senderAvatar = newMessage.sender_avatar;

    io.to(newMessage.table_id).emit('new_board_message', newMessage);

    // Send push notification to other users
    // 1. Get the table name and workspace/shared users
    const tableRes = await db.query('SELECT name, workspace_id, shared_users FROM tables WHERE id = $1', [newMessage.table_id]);
    if (tableRes.rows.length > 0) {
      const table = tableRes.rows[0];
      const tableName = table.name;
      
      // 2. Determine recipients
      // Start with workspace owner
      const workspaceRes = await db.query('SELECT owner_id FROM workspaces WHERE id = $1', [table.workspace_id]);
      let recipientIds = new Set();
      
      if (workspaceRes.rows.length > 0) {
        recipientIds.add(workspaceRes.rows[0].owner_id);
      }

      // Add shared users
      if (Array.isArray(table.shared_users)) {
        table.shared_users.forEach(u => {
          if (typeof u === 'string') recipientIds.add(u);
          else if (u.userId) recipientIds.add(u.userId);
        });
      }

      // Remove sender (so you don't receive notifications for your own messages)
      recipientIds.delete(req.user.id);
      
      // console.log(`[Chat Notification] Sender: ${req.user.id}, Potential Recipients: ${Array.from(recipientIds).join(', ')}`);

      if (recipientIds.size > 0) {
        const recipientsArray = Array.from(recipientIds);
        
        // 1. Send Push Notifications
        const tokensRes = await db.query('SELECT id, fcm_token FROM users WHERE id = ANY($1) AND fcm_token IS NOT NULL', [recipientsArray]);
        
        const tokens = tokensRes.rows.map(r => r.fcm_token);
        console.log(`[Chat Notification] Found ${tokens.length} tokens for users: ${tokensRes.rows.map(r => r.id).join(', ')}`);

        if (tokens.length > 0) {
          await sendPushNotification(tokens, `New message in ${tableName}`, `${newMessage.sender}: ${newMessage.text}`, {
              type: 'chat_message',
              tableId: newMessage.table_id,
              workspaceId: table.workspace_id,
              senderId: req.user.id
          });
        }
        
        // 2. Save In-App Notifications
        for (const recipientId of recipientsArray) {
            await db.query(`
                INSERT INTO notifications (id, recipient_id, sender_id, type, data, read, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [uuidv4(), recipientId, req.user.id, 'chat_message', {
                subject: `New message in ${tableName}`,
                body: `${newMessage.sender}: ${newMessage.text}`,
                tableName: tableName,
                tableId: table.id,
                workspaceId: table.workspace_id,
                senderId: req.user.id
            }, false]);
        }
      }
    }

    res.json(newMessage);
  } catch (err) {
    console.error('Error posting chat message:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

const startServer = () => {
    server.listen(PORT, '0.0.0.0', () => {
        try {
            console.log(`> Ready on http://localhost:${PORT}`);
            console.log(`Express server running on http://0.0.0.0:${PORT}`);
            console.log(`Socket.IO listening on port ${PORT}`);
        } catch (err) {
            console.error('Error starting server/socket:', err);
        }
    });
};

if (dev && nextApp) {
    nextApp.prepare().then(() => {
        app.all(/(.*)/, (req, res) => {
            return handle(req, res);
        });
        startServer();
    });
} else {
    startServer();
}

// --- Scheduled Message Processor (Cron Job) ---
setInterval(async () => {
    try {
        // Find rows with scheduled messages that haven't been sent
        // Using a broad text search for efficiency, then filtering in JS
        const result = await db.query(`
            SELECT r.id, r.table_id, r.values
            FROM rows r
            WHERE r.values::text LIKE '%"scheduledFor"%' 
        `); 

        for (const row of result.rows) {
            let changed = false;
            const messages = row.values.message;
            if (!Array.isArray(messages)) continue;

            const tableRes = await db.query('SELECT * FROM tables WHERE id = $1', [row.table_id]);
            const table = tableRes.rows[0];
            if (!table) continue;

            for (const msg of messages) {
                if (msg.scheduledFor && !msg.notificationSent) {
                    if (new Date(msg.scheduledFor) <= new Date()) {
                        
                        let taskName = 'Task';
                        if (table.columns && Array.isArray(table.columns)) {
                            const taskCol = table.columns.find(c => c.id === 'task') || table.columns[0];
                            if (taskCol && row.values[taskCol.id]) {
                                taskName = row.values[taskCol.id];
                            }
                        } else if (row.values['task']) {
                            taskName = row.values['task'];
                        }

                        const userName = msg.sender || 'System';
                        
                        // Send Notification via imported helper
                        await sendNotification(
                            'New Discussion',
                            `${userName} commented on the ${taskName}: ${msg.text}`,
                            'task_chat',
                            { taskId: row.id },
                            table,
                            null
                        );
                        
                        msg.notificationSent = true;
                        changed = true;
                    }
                }
            }

            if (changed) {
                await db.query('UPDATE rows SET values = $1 WHERE id = $2', [JSON.stringify(row.values), row.id]);
                console.log(`[Scheduler] Processed scheduled messages for Task ${row.id}`);
            }
        }
    } catch (e) {
        console.error('Error processing scheduled messages:', e);
    }
}, 60000); // Check every minute
