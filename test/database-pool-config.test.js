import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "src", "app", "api", "_lib", "server.js"), "utf8");

test("Vercel database pool is singleton and serverless bounded", () => {
  assert.match(source, /Symbol\.for\("smart-manage\.database-pool"\)/);
  assert.match(source, /globalThis\[DATABASE_POOL_KEY\]\s*\|\|=/);
  assert.match(source, /DATABASE_POOL_MAX, 2, 2/);
  assert.match(source, /connectionTimeoutMillis:/);
  assert.match(source, /idleTimeoutMillis:/);
  assert.match(source, /allowExitOnIdle:\s*true/);
});
