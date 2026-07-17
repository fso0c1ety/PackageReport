const test=require("node:test");const assert=require("node:assert/strict");const m=require("../server/services/marketplaceEngine.cjs");
test("Phase 18 categories are complete",()=>assert.equal(m.CATEGORIES.length,10));
test("marketplace strips markup and control characters",()=>assert.equal(m.sanitizeText("<b>Hello</b>\u0000 world"),"Hello world"));
test("template manifests reject executable content",()=>{assert.equal(m.validateManifest({templateKey:"blank",script:"alert(1)"},["blank"]).valid,false);assert.equal(m.validateManifest({templateKey:"blank",version:2},["blank"]).valid,true)});
