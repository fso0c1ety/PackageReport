import test from "node:test";
import assert from "node:assert/strict";
import { isSafePublicHttpsUrl, rateLimit } from "../src/app/api/_lib/security.js";

test("webhooks accept a public HTTPS endpoint", () => {
  assert.equal(isSafePublicHttpsUrl("https://hooks.example.com/smart-manage"), true);
});

test("webhooks reject local, private, credentialed and insecure endpoints", () => {
  assert.equal(isSafePublicHttpsUrl("http://hooks.example.com"), false);
  assert.equal(isSafePublicHttpsUrl("https://localhost/hook"), false);
  assert.equal(isSafePublicHttpsUrl("https://192.168.1.5/hook"), false);
  assert.equal(isSafePublicHttpsUrl("https://10.0.0.4/hook"), false);
  assert.equal(isSafePublicHttpsUrl("https://user:pass@example.com/hook"), false);
});

test("rate limiter blocks requests above the configured window quota", () => {
  const key = `test-${Date.now()}-${Math.random()}`;
  assert.equal(rateLimit(key, 2, 60_000).allowed, true);
  assert.equal(rateLimit(key, 2, 60_000).allowed, true);
  const blocked = rateLimit(key, 2, 60_000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfter > 0);
});
