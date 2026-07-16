const test = require("node:test");
const assert = require("node:assert/strict");
const { detectCircularDependencies, evaluateFormula, extractDependencies } = require("../server/services/formulaEngine");

test("formula engine evaluates references, arithmetic and functions without eval", () => {
  const context = { values: { Revenue: 120, Costs: 45 } };
  assert.equal(evaluateFormula("[Revenue] - [Costs]", context), 75);
  assert.equal(evaluateFormula("ROUND(AVG([Revenue], [Costs]), 1)", context), 82.5);
  assert.equal(evaluateFormula("IF([Revenue] > 100, 1, 0)", context), 1);
});

test("formula engine supports relation and rollup context", () => {
  const context = { related: { Projects: ["p1", "p2"] }, rollups: { Revenue: 300 } };
  assert.deepEqual(evaluateFormula('RELATED("Projects")', context), ["p1", "p2"]);
  assert.equal(evaluateFormula('ROLLUP("Revenue")', context), 300);
});

test("formula dependencies are extracted and circular references detected", () => {
  assert.deepEqual(extractDependencies("[Revenue] - [Costs]"), ["Revenue", "Costs"]);
  assert.deepEqual(detectCircularDependencies({ A: "[B] + 1", B: "[C]", C: "[A]" }), ["A", "B", "C", "A"]);
  assert.equal(detectCircularDependencies({ Profit: "[Revenue] - [Costs]" }), null);
});

test("formula engine rejects unsafe or unsupported input", () => {
  assert.throws(() => evaluateFormula("process.exit()"), /Invalid formula|Unsupported function/);
  assert.throws(() => evaluateFormula("UNKNOWN(1)"), /Unsupported function/);
});
