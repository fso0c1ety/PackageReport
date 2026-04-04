const { app, BrowserWindow, shell, protocol, net } = require("electron");
const fs = require("fs");
const path = require("path");

// Register custom protocol BEFORE app is ready so it can be used as a
// secure origin (allows absolute paths like /home.html to resolve correctly,
// the same way Capacitor uses http://localhost/).
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
      allowServiceWorkers: true,
      bypassCSP: true,
    },
  },
]);

function resolveWindowIcon() {
  const candidates = [
    path.join(app.getAppPath(), "out", "icon.png"),
    path.join(app.getAppPath(), "src", "app", "icon.png"),
    path.join(__dirname, "..", "src", "app", "icon.png"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function createMainWindow() {
  const iconPath = resolveWindowIcon();

  const win = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: "SMART MANAGE",
    backgroundColor: "#F8FAFC",
    autoHideMenuBar: true,
    titleBarStyle: process.platform === "win32" ? "hidden" : "default",
    titleBarOverlay:
      process.platform === "win32"
        ? {
            color: "#F8FAFC",
            symbolColor: "#0F172A",
            height: 48,
          }
        : false,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  win.loadURL("app://localhost/index.html");

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  app.setName("SMART MANAGE");

  const { session } = require("electron");
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // Automatically grant media and notification permissions for the app:// protocol
    const allowedPermissions = ['media', 'mediaKeySystem', 'display-capture', 'notifications', 'fullscreen'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Serve the static out/ directory under app://localhost/
  const outDir = path.join(app.getAppPath(), "out");
  const rawRemoteOrigin = process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.NEXT_PUBLIC_API_URL || "https://package-report.vercel.app";
  const remoteOrigin = rawRemoteOrigin.replace(/\/api\/?$/i, "").replace(/\/$/, "");

  protocol.handle("app", (request) => {
    const url = new URL(request.url);
    const isProxiedPath =
      url.pathname === "/api" ||
      url.pathname.startsWith("/api/") ||
      url.pathname === "/uploads" ||
      url.pathname.startsWith("/uploads/");

    if (isProxiedPath) {
      const upstreamUrl = `${remoteOrigin}${url.pathname}${url.search}`;
      const headers = Object.fromEntries(request.headers.entries());
      delete headers.host;
      delete headers.origin;
      delete headers["content-length"];

      const fetchOptions = {
        method: request.method,
        headers,
      };

      if (request.method !== "GET" && request.method !== "HEAD") {
        fetchOptions.body = request.body;
        fetchOptions.duplex = "half";
      }

      return net.fetch(upstreamUrl, fetchOptions).catch((error) => {
        console.error("[app protocol proxy] Failed request:", request.method, upstreamUrl, error);
        return new Response(
          JSON.stringify({ error: "Proxy request failed", details: error?.message || String(error) }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      });
    }

    let filePath = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\//, "");

    if (filePath && !path.extname(filePath)) {
      const htmlCandidate = `${filePath}.html`;
      const htmlPath = path.join(outDir, htmlCandidate);
      if (fs.existsSync(htmlPath)) {
        filePath = htmlCandidate;
      }
    }

    const { pathToFileURL } = require("url");
    const fullPath = path.join(outDir, filePath);

    if (fullPath.endsWith('.mp4') && fs.existsSync(fullPath)) {
      const { size } = fs.statSync(fullPath);
      const range = request.headers.get('Range') || request.headers.get('range') || '';
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
        const chunksize = (end - start) + 1;
        
        const file = fs.createReadStream(fullPath, { start, end });
        // @ts-ignore
        const nodeStream = require('stream').Readable.toWeb(file);
        
        return new Response(nodeStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize.toString(),
            'Content-Type': 'video/mp4'
          }
        });
      } else {
        const file = fs.createReadStream(fullPath);
        // @ts-ignore
        const nodeStream = require('stream').Readable.toWeb(file);
        
        return new Response(nodeStream, {
          status: 200,
          headers: {
            'Content-Length': size.toString(),
            'Content-Type': 'video/mp4'
          }
        });
      }
    }

    const fetchOptions = {
        headers: request.headers,
        method: request.method,
    };
    return net.fetch(pathToFileURL(fullPath).toString(), fetchOptions);
  });
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
