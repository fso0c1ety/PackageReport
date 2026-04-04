const { app, BrowserWindow, shell, protocol, net } = require("electron");
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

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadURL("app://localhost/index.html");

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  // Serve the static out/ directory under app://localhost/
  const outDir = path.join(app.getAppPath(), "out");
  protocol.handle("app", (request) => {
    const url = new URL(request.url);
    let filePath = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\//, "");
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
