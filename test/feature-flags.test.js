const test = require("node:test");
const assert = require("node:assert/strict");
const { envName, getFeatureFlags, isFeatureEnabled } = require("../server/config/featureFlags");

test("feature flags use safe production defaults", () => {
  const flags = getFeatureFlags({});
  assert.equal(flags.universalTemplates, false);
  assert.equal(flags.relationColumns, false);
  assert.equal(flags.calendarView, true);
});

test("feature flags can be enabled and disabled through environment values", () => {
  assert.equal(getFeatureFlags({ FEATURE_UNIVERSAL_TEMPLATES: "true" }).universalTemplates, true);
  assert.equal(getFeatureFlags({ FEATURE_CALENDAR_VIEW: "off" }).calendarView, false);
  assert.equal(isFeatureEnabled("unknownFlag", {}), false);
});

test("feature flag environment names are deterministic", () => {
  assert.equal(envName("enterprisePermissions"), "FEATURE_ENTERPRISE_PERMISSIONS");
});
