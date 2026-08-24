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
