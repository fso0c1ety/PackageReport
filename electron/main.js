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
    title: "Smar Manage",
    backgroundColor: "#0b1220",
    autoHideMenuBar: true,
    titleBarStyle: process.platform === "win32" ? "hidden" : "default",
    titleBarOverlay:
      process.platform === "win32"
        ? {
            color: "#111827",
            symbolColor: "#ffffff",
            height: 46,
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
  app.setName("Smar Manage");

  // Serve the static out/ directory under app://localhost/
  const outDir = path.join(app.getAppPath(), "out");
  const rawRemoteOrigin = process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.NEXT_PUBLIC_API_URL || "https://package-report.vercel.app";
  const remoteOrigin = rawRemoteOrigin.replace(/\/api\/?$/i, "").replace(/\/$/, "");

  protocol.handle("app", (request) => {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) {
      const upstreamUrl = `${remoteOrigin}${url.pathname}${url.search}`;
      return net.fetch(upstreamUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
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

    return net.fetch("file://" + path.join(outDir, filePath));
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
