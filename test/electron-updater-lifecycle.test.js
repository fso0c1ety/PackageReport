const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const main = fs.readFileSync(require.resolve("../electron/main.js"), "utf8");

test("desktop updater performs startup, periodic, and manual fresh checks", () => {
  assert.match(main, /UPDATE_CHECK_INTERVAL_MS = 30 \* 60 \* 1000/);
  assert.match(main, /startupUpdateCheckTimer = setTimeout/);
  assert.match(main, /updateCheckTimer = setInterval/);
  assert.match(main, /autoUpdater\.setFeedURL\(\{ provider: "github"/);
  assert.match(main, /ipcMain\.handle\("smart-manage-updater:check"/);
  assert.match(main, /updaterCheckPromise/);
});

test("desktop updater cleans timers and prevents duplicate configuration", () => {
  assert.match(main, /if \(updaterConfigured\) return/);
  assert.match(main, /if \(app\.isPackaged && !updateCheckTimer\)/);
  assert.match(main, /clearTimeout\(startupUpdateCheckTimer\)/);
  assert.match(main, /clearInterval\(updateCheckTimer\)/);
});
