const { app, BrowserWindow, shell, protocol, net, Tray, Menu, nativeImage } = require("electron");
const fs = require("fs");
const path = require("path");

let mainWindow = null;
let mainWindowReady = false;
let splashWindow = null;
let tray = null;
let isQuitting = false;
let closeToTrayNoticeShown = false;
const SPLASH_MINIMUM_MS = 10000;

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

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

function resolveSplashVideoPath() {
  const candidates = [
    path.join(process.resourcesPath, "assets", "Smart Manage.mp4"),
    path.join(app.getAppPath(), "Smart Manage.mp4"),
    path.join(__dirname, "..", "Smart Manage.mp4"),
    path.join(process.cwd(), "Smart Manage.mp4"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function getSplashVideoSource() {
  const videoPath = resolveSplashVideoPath();
  if (!videoPath) {
    return "";
  }

  try {
    const videoBuffer = fs.readFileSync(videoPath);
    return `data:video/mp4;base64,${videoBuffer.toString("base64")}`;
  } catch (error) {
    console.warn("[electron] Failed to inline splash video, falling back to file URL:", error);
    const { pathToFileURL } = require("url");
    return pathToFileURL(videoPath).toString();
  }
}

function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 980,
    height: 560,
    show: true,
    frame: false,
    transparent: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: "#050816",
    ...(resolveWindowIcon() ? { icon: resolveWindowIcon() } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  const videoSrc = getSplashVideoSource();
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data: file:; media-src 'self' data: file:;" />
    <title>SMART MANAGE</title>
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #050816;
        font-family: Arial, sans-serif;
      }
      .wrap {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at center, rgba(99,102,241,0.18), rgba(5,8,22,1) 72%);
      }
      video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        background: #050816;
        opacity: 0;
        transition: opacity 220ms ease;
      }
      video.ready {
        opacity: 1;
      }
      .fallback {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        gap: 12px;
        letter-spacing: 0.04em;
        background: radial-gradient(circle at center, rgba(99,102,241,0.18), rgba(5,8,22,0.96) 72%);
        transition: opacity 220ms ease;
      }
      .fallback.hidden {
        opacity: 0;
        pointer-events: none;
      }
      .spinner {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 4px solid rgba(255,255,255,0.15);
        border-top-color: #818cf8;
        animation: spin 1s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div class="wrap">
      ${videoSrc ? `<video autoplay muted loop playsinline preload="auto"><source src="${videoSrc}" type="video/mp4" /></video>` : ""}
      <div class="fallback" id="fallback">
        <div class="spinner"></div>
        <div>SMART MANAGE is loading...</div>
      </div>
    </div>
    <script>
      const video = document.querySelector('video');
      const fallback = document.getElementById('fallback');

      const showFallback = () => {
        if (fallback) fallback.classList.remove('hidden');
      };

      const hideFallback = () => {
        if (fallback) fallback.classList.add('hidden');
      };

      if (!video) {
        showFallback();
      }

      if (video) {
        const revealVideo = () => {
          video.classList.add('ready');
          hideFallback();
        };

        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;

        video.addEventListener('loadeddata', revealVideo);
        video.addEventListener('canplay', revealVideo);
        video.addEventListener('playing', revealVideo);
        video.addEventListener('stalled', showFallback);
        video.addEventListener('suspend', showFallback);
        video.addEventListener('error', showFallback);

        Promise.resolve(video.play())
          .then(revealVideo)
          .catch(showFallback);

        setTimeout(() => {
          if (video.readyState < 2) {
            showFallback();
          }
        }, 1800);
      }
    </script>
  </body>
</html>`;

  splash.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);

  setTimeout(() => {
    if (!splash.isDestroyed()) {
      splash.close();
    }
  }, SPLASH_MINIMUM_MS);

  splash.on("closed", () => {
    splashWindow = null;
    if (mainWindow && !mainWindow.isDestroyed() && mainWindowReady) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return splash;
}

function createTray(win) {
  if (tray || process.platform !== "win32") {
    return;
  }

  const iconPath = resolveWindowIcon();
  const trayIcon = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  tray = new Tray(trayIcon);

  const restoreWindow = () => {
    if (win.isMinimized()) {
      win.restore();
    }
    win.show();
    win.focus();
  };

  tray.setToolTip("SMART MANAGE");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open SMART MANAGE", click: restoreWindow },
      {
        label: "Quit",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("click", restoreWindow);
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
      backgroundThrottling: false,
    },
  });

  mainWindowReady = false;

  win.once("ready-to-show", () => {
    mainWindowReady = true;
    if (!splashWindow || splashWindow.isDestroyed()) {
      win.show();
    }
  });

  win.loadURL("app://localhost/index.html");

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  createTray(win);

  const hideToTray = () => {
    win.hide();

    if (!closeToTrayNoticeShown && tray?.displayBalloon) {
      tray.displayBalloon({
        title: "SMART MANAGE",
        content: "The app is still running in the background so desktop notifications can arrive.",
      });
      closeToTrayNoticeShown = true;
    }
  };

  // Let the minimize button behave normally so the app can stay on the taskbar.
  // The close button still hides to tray on Windows to keep background notifications alive.
  win.on("close", (event) => {
    if (!isQuitting && process.platform === "win32") {
      event.preventDefault();
      hideToTray();
    }
  });

  return win;
}

app.whenReady().then(() => {
  app.setName("SMART MANAGE");
  app.setAppUserModelId("com.packagereport.desktop");

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
  splashWindow = createSplashWindow();
  mainWindow = createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && isQuitting) {
    app.quit();
  }
});
