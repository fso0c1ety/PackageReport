const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(require.resolve(`../${file}`), "utf8");

test("custom Electron title bar uses native window state controls", () => {
  const bar = read("src/app/DesktopWindowBar.tsx");
  const preload = read("electron/preload.js");
  const main = read("electron/main.js");
  assert.match(bar, /smartManageWindow/);
  assert.match(bar, /isMaximized/);
  assert.match(bar, /onDoubleClick/);
  assert.match(bar, /Smart Manage/);
  assert.match(preload, /smart-manage-window:maximize/);
  assert.match(preload, /smart-manage-window:minimize/);
  assert.match(preload, /smart-manage-window:close/);
  assert.match(main, /mainWindow\.isMaximized\(\)/);
       assert.match(main, /win\.on\("maximize"/);
       assert.match(main, /win\.on\("unmaximize"/);
});

test("native title bar keeps updater integration untouched", () => {
  const main = read("electron/main.js");
  assert.match(main, /autoUpdater\.setFeedURL/);
  assert.match(main, /autoUpdater\.downloadUpdate/);
  assert.match(main, /autoUpdater\.quitAndInstall/);
});

test("native Electron visibility is wired to TableBoard loading semantics", () => {
  const board = read("src/app/TableBoard.tsx");
  const preload = read("electron/preload.js");
  const main = read("electron/main.js");

  // Visible native windows must not be treated as hidden; hidden native
  // windows must pause background loading. Unknown state may use the DOM fallback.
  assert.match(board, /isHidden:\s*\(\) => nativeWindowVisibleRef\.current === false/);
  assert.match(board, /nativeWindowVisibleRef\.current === true[\s\S]*?taskPagerRef\.current\?\.resume/);
  assert.match(board, /nativeWindowVisibleRef\.current === null && document\.hidden/);
  assert.match(board, /nativeWindow\?\.getState\?\.\(\)\.then\(applyNativeVisibility\)/);

  // The state comes from BrowserWindow, rather than document.hidden alone.
  assert.match(main, /isVisible: Boolean\(mainWindow\?\.isVisible\(\)\)/);
  assert.match(main, /win\.on\("show", notifyWindowVisible\)/);
  assert.match(main, /win\.on\("hide", notifyWindowVisible\)/);
  assert.match(preload, /onVisible: \(callback\)/);
  assert.match(preload, /callback\(state\)/);
});
