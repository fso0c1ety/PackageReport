import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

test("renewal banner opens the in-app Plan & Billing overview", () => {
  const source = fs.readFileSync(new URL("../src/app/SubscriptionBanner.tsx", import.meta.url), "utf8");
  assert.match(source, /navigateToAppRoute\("\/settings\/\?tab=billing", router\)/);
  assert.doesNotMatch(source, /navigateToAppRoute\("\/pricing", router\)/);
});
