const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(require.resolve(`../${file}`), "utf8");

test("Electron auth shell reserves the native title bar and scrolls only overflowing content", () => {
  const layout = read("src/app/(auth)/layout.tsx");
  const login = read("src/app/(auth)/login/page.tsx");

  assert.match(layout, /DesktopWindowBar/);
  assert.match(layout, /height: '100vh'/);
  assert.match(layout, /flexDirection: 'column'/);
  assert.match(layout, /flex: 1/);
  assert.match(layout, /minHeight: 0/);
  assert.match(layout, /overflow: 'auto'/);
  assert.match(login, /electronRuntime \? '100%'/);
  assert.match(login, /boxSizing: 'border-box'/);
  assert.match(login, /electronRuntime \? 0 : 610/);
});

test("auth window reuses the existing native controls instead of adding a second integration", () => {
  const layout = read("src/app/(auth)/layout.tsx");
  assert.match(layout, /import DesktopWindowBar from/);
  assert.equal((layout.match(/<DesktopWindowBar\s*\/>/g) || []).length, 1);
});
