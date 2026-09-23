import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "src", "app", "(dashboard)", "workspace", "page.tsx"), "utf8");

test("workspace startup defers non-critical metadata acquisitions", () => {
  assert.match(source, /requestIdleCallback\(callback, \{ timeout: 2000 \}\)/);
  assert.match(source, /schedule\(\(\) => void authenticatedFetch\(getApiUrl\(`workspaces\/\$\{workspaceId\}\/modules`/);
  assert.match(source, /schedule\(\(\) => \{[\s\S]*authenticatedFetch\(getApiUrl\(`workspaces\/\$\{workspaceId\}`\)/);
});
