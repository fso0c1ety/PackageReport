import assert from "node:assert/strict";
import test from "node:test";

import {
  hashPublicSharePassword,
  publicShareCookieName,
  publicShareUnlockValue,
  verifyPublicSharePassword,
} from "../src/app/api/_lib/publicShareSecurity.js";

test("public share passwords are salted and verifiable", async () => {
  const first = await hashPublicSharePassword("A-secure-client-password");
  const second = await hashPublicSharePassword("A-secure-client-password");
  assert.notEqual(first, second);
  assert.equal(await verifyPublicSharePassword("A-secure-client-password", first), true);
  assert.equal(await verifyPublicSharePassword("wrong-password", first), false);
});

test("public share unlock cookies are deterministic per token", () => {
  assert.equal(publicShareCookieName("token-a"), publicShareCookieName("token-a"));
  assert.notEqual(publicShareCookieName("token-a"), publicShareCookieName("token-b"));
  assert.notEqual(publicShareUnlockValue("token-a"), publicShareUnlockValue("token-b"));
});
