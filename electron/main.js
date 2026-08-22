const { app, BrowserWindow, shell, protocol, net, Tray, Menu, nativeImage, ipcMain, safeStorage } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("fs");
const path = require("path");

let mainWindow = null;
let mainWindowReady = false;
let splashWindow = null;
let splashShownAt = 0;
let tray = null;
let isQuitting = false;
let closeToTrayNoticeShown = false;
const SPLASH_MINIMUM_MS = 1800;
const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
let updateCheckTimer = null;
let desktopUpdateState = { state: "idle", version: app.getVersion() };

function publishUpdateState(patch) {
  desktopUpdateState = { ...desktopUpdateState, ...patch };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("smart-manage-updater:state", desktopUpdateState);
  }
}

function configureDesktopUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.setFeedURL({ provider: "github", owner: "fso0c1ety", repo: "PackageReport" });

  autoUpdater.on("checking-for-update", () => publishUpdateState({ state: "checking" }));
  autoUpdater.on("update-not-available", () => publishUpdateState({ state: "idle", version: app.getVersion() }));
  autoUpdater.on("update-available", (info) => publishUpdateState({ state: "available", version: info.version }));
  autoUpdater.on("download-progress", (info) => publishUpdateState({ state: "downloading", percent: info.percent, version: info.version || desktopUpdateState.version }));
  autoUpdater.on("update-downloaded", (info) => publishUpdateState({ state: "ready", percent: 100, version: info.version }));
  autoUpdater.on("error", (error) => {
    const message = String(error?.message || "");
    const harmlessNoUpdate = /No published versions|latest version|No update available|Cannot find channel/i.test(message);
    if (harmlessNoUpdate) {
      publishUpdateState({ state: "idle", version: app.getVersion() });
      return;
    }
    console.warn("[electron-updater] Update operation failed:", message);
    publishUpdateState({ state: "error", message: "The update could not be completed." });
  });

  ipcMain.handle("smart-manage-updater:check", async () => {
    if (!app.isPackaged) return publishUpdateState({ state: "idle", version: app.getVersion() });
    await autoUpdater.checkForUpdates();
  });
  ipcMain.handle("smart-manage-updater:download", async () => {
    if (!app.isPackaged || desktopUpdateState.state !== "available") return;
    await autoUpdater.downloadUpdate();
  });
  ipcMain.handle("smart-manage-updater:install", () => {
    if (!app.isPackaged || desktopUpdateState.state !== "ready") return;
    isQuitting = true;
    autoUpdater.quitAndInstall(false, true);
  });
  ipcMain.handle("smart-manage-updater:state", () => desktopUpdateState);

  if (app.isPackaged) {
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => undefined), 15000);
    updateCheckTimer = setInterval(() => autoUpdater.checkForUpdates().catch(() => undefined), UPDATE_CHECK_INTERVAL_MS);
  }
}

function secureAuthFile() {
  return path.join(app.getPath("userData"), "secure-auth.bin");
}

function registerSecureAuthStorage() {
  ipcMain.handle("secure-auth:get", () => {
    try {
      const file = secureAuthFile();
      if (!safeStorage.isEncryptionAvailable() || !fs.existsSync(file)) return null;
      return safeStorage.decryptString(fs.readFileSync(file));
    } catch (error) {
      console.warn("[electron] Unable to read secure auth storage:", error.message);
      return null;
    }
  });
  ipcMain.handle("secure-auth:set", (_event, value) => {
    if (!safeStorage.isEncryptionAvailable()) throw new Error("OS encryption is unavailable");
    fs.writeFileSync(secureAuthFile(), safeStorage.encryptString(String(value || "")));
    return true;
  });
  ipcMain.handle("secure-auth:clear", () => {
    const file = secureAuthFile();
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return true;
  });
}

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
    path.join(app.getAppPath(), "electron", "icon.ico"),
    path.join(__dirname, "icon.ico"),
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

function getSplashLogoSource() {
  const iconPath = resolveWindowIcon();
  if (!iconPath) return "";
  try {
    const extension = path.extname(iconPath).toLowerCase();
    const mime = extension === ".png" ? "image/png" : "image/x-icon";
    const iconBuffer = fs.readFileSync(iconPath);
    return `data:${mime};base64,${iconBuffer.toString("base64")}`;
  } catch (error) {
    console.warn("[electron] Failed to read splash logo:", error.message);
    return "";
  }
}

function revealMainWindowWhenReady() {
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindowReady) return;
  if (splashWindow && !splashWindow.isDestroyed()) {
    const remaining = Math.max(0, SPLASH_MINIMUM_MS - (Date.now() - splashShownAt));
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
    }, remaining);
    return;
  }
  mainWindow.show();
  mainWindow.focus();
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
      preload: path.join(__dirname, "preload.js"),
      backgroundThrottling: false,
    },
  });

  splashShownAt = Date.now();
  const logoSrc = getSplashLogoSource();
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data: file:; img-src 'self' data: file:;" />
    <title>Smart Manage</title>
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #050816;
        font-family: "Segoe UI", "Inter", Arial, sans-serif;
      }
      .wrap {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 14px;
        background:
          radial-gradient(circle at 50% 42%, rgba(99,102,241,0.22), rgba(5,8,22,1) 68%),
          linear-gradient(180deg, #080b1e 0%, #050816 100%);
      }
      .logo-wrap {
        width: 92px;
        height: 92px;
        border-radius: 24px;
        display: grid;
        place-items: center;
        background: rgba(129, 140, 248, 0.08);
        border: 1px solid rgba(129, 140, 248, 0.28);
        box-shadow: 0 0 30px rgba(99, 102, 241, 0.24);
        animation: logoPulse 2.1s ease-in-out infinite;
      }
      .logo {
        width: 64px;
        height: 64px;
        object-fit: contain;
      }
      .title {
        margin-top: 6px;
        color: #f8fafc;
        font-size: 30px;
        font-weight: 800;
        letter-spacing: -0.03em;
      }
      .subtitle {
        color: rgba(226, 232, 240, 0.88);
        font-size: 16px;
        font-weight: 500;
      }
      .spinner {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid rgba(148, 163, 184, 0.26);
        border-top-color: #818cf8;
        animation: spin .92s linear infinite;
      }
      .tagline {
        color: rgba(148, 163, 184, 0.72);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      @keyframes logoPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 28px rgba(99, 102, 241, 0.22); }
        50% { transform: scale(1.015); box-shadow: 0 0 38px rgba(99, 102, 241, 0.32); }
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="logo-wrap">${logoSrc ? `<img class="logo" src="${logoSrc}" alt="Smart Manage" />` : ""}</div>
      <div class="title">Smart Manage</div>
      <div class="subtitle">Preparing your workspace...</div>
      <div class="spinner" aria-hidden="true"></div>
      <div class="tagline">One workspace. Zero chaos.</div>
    </div>
  </body>
</html>`;

  splash.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);

  splash.on("closed", () => {
    splashWindow = null;
    revealMainWindowWhenReady();
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

  tray.setToolTip("Smart Manage");
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
    title: "Smart Manage",
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
      preload: path.join(__dirname, "preload.js"),
      backgroundThrottling: false,
    },
  });

  mainWindowReady = false;

  win.once("ready-to-show", () => {
    mainWindowReady = true;
    revealMainWindowWhenReady();
  });

  win.loadURL("app://localhost/home.html");

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (["https:", "http:", "mailto:"].includes(target.protocol)) {
        shell.openExternal(url);
      }
    } catch {}
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    try {
      const target = new URL(url);
      if (target.protocol === "app:" && target.host === "localhost") return;
      event.preventDefault();
      if (["https:", "http:", "mailto:"].includes(target.protocol)) {
        shell.openExternal(url);
      }
    } catch {
      event.preventDefault();
    }
  });

  createTray(win);

  const hideToTray = () => {
    win.hide();

    if (!closeToTrayNoticeShown && tray?.displayBalloon) {
      tray.displayBalloon({
        title: "Smart Manage",
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
  app.setName("Smart Manage");
  app.setAppUserModelId("com.packagereport.desktop");
  registerSecureAuthStorage();
  configureDesktopUpdater();

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
  if (updateCheckTimer) clearInterval(updateCheckTimer);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && isQuitting) {
    app.quit();
  }
});
