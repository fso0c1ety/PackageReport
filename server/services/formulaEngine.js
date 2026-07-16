const toNumber = (value) => Number(value?.amount ?? value?.value ?? value);

const FUNCTIONS = {
  SUM: (...values) => values.flat(Infinity).map(toNumber).filter(Number.isFinite).reduce((a, b) => a + b, 0),
  AVG: (...values) => { const nums = values.flat(Infinity).map(toNumber).filter(Number.isFinite); return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; },
  MIN: (...values) => Math.min(...values.flat(Infinity).map(toNumber).filter(Number.isFinite)),
  MAX: (...values) => Math.max(...values.flat(Infinity).map(toNumber).filter(Number.isFinite)),
  COUNT: (...values) => values.flat(Infinity).filter((value) => value !== null && value !== undefined && value !== "").length,
  IF: (condition, yes, no) => condition ? yes : no,
  AND: (...values) => values.every(Boolean),
  OR: (...values) => values.some(Boolean),
  ROUND: (value, digits = 0) => Number(toNumber(value).toFixed(toNumber(digits))),
  ABS: (value) => Math.abs(toNumber(value)),
  TODAY: () => new Date(new Date().toDateString()),
  NOW: () => new Date(),
  DATE_DIFF: (a, b) => Math.round((new Date(a) - new Date(b)) / 86400000),
  DAYS_BETWEEN: (a, b) => Math.abs(Math.round((new Date(a) - new Date(b)) / 86400000)),
  CONCAT: (...values) => values.join(""),
  RELATED: (name, context) => context?.related?.[name] || [],
  ROLLUP: (name, context) => context?.rollups?.[name] ?? null,
};

function tokenize(source) {
  const tokens = [];
  const pattern = /\s*(?:([0-9]+(?:\.[0-9]+)?)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\[[^\]]+\])|([A-Za-z_][A-Za-z0-9_]*)|(>=|<=|!=|==|[+\-*/%(),<>]))/gy;
  let offset = 0;
  while (offset < source.length) {
    pattern.lastIndex = offset;
    const match = pattern.exec(source);
    if (!match) throw new Error(`Invalid formula near: ${source.slice(offset, offset + 12)}`);
    offset = pattern.lastIndex;
    if (match[1]) tokens.push({ type: "number", value: Number(match[1]) });
    else if (match[2]) tokens.push({ type: "string", value: JSON.parse(match[2][0] === "'" ? `"${match[2].slice(1, -1).replace(/"/g, '\\"')}"` : match[2]) });
    else if (match[3]) tokens.push({ type: "reference", value: match[3].slice(1, -1).trim() });
    else if (match[4]) tokens.push({ type: "identifier", value: match[4] });
    else tokens.push({ type: match[5], value: match[5] });
  }
  return tokens;
}

function evaluateFormula(source, context = {}) {
  const tokens = tokenize(String(source || "").replace(/^=/, ""));
  let index = 0;
  const peek = () => tokens[index];
  const take = (type) => { const token = tokens[index]; if (!token || (type && token.type !== type)) throw new Error(`Expected ${type || "token"}`); index += 1; return token; };
  function primary() {
    const token = peek();
    if (!token) throw new Error("Unexpected end of formula");
    if (token.type === "number" || token.type === "string") return take().value;
    if (token.type === "reference") return context.values?.[take().value] ?? 0;
    if (token.type === "identifier") {
      const name = take().value.toUpperCase();
      if (name === "TRUE" || name === "FALSE") return name === "TRUE";
      take("("); const args = [];
      if (peek()?.type !== ")") { do { args.push(comparison()); } while (peek()?.type === "," && take(",")); }
      take(")");
      const fn = FUNCTIONS[name];
      if (!fn) throw new Error(`Unsupported function: ${name}`);
      return name === "RELATED" || name === "ROLLUP" ? fn(...args, context) : fn(...args);
    }
    if (token.type === "(") { take("("); const value = comparison(); take(")"); return value; }
    if (token.type === "-") { take("-"); return -toNumber(primary()); }
    throw new Error(`Unexpected token: ${token.type}`);
  }
  function multiply() { let value = primary(); while (["*", "/", "%"].includes(peek()?.type)) { const op = take().type; const right = toNumber(primary()); value = op === "*" ? toNumber(value) * right : op === "/" ? toNumber(value) / right : toNumber(value) % right; } return value; }
  function add() { let value = multiply(); while (["+", "-"].includes(peek()?.type)) { const op = take().type; const right = multiply(); value = op === "+" ? toNumber(value) + toNumber(right) : toNumber(value) - toNumber(right); } return value; }
  function comparison() { let value = add(); while ([">", "<", ">=", "<=", "==", "!="].includes(peek()?.type)) { const op = take().type; const right = add(); value = ({ ">": value > right, "<": value < right, ">=": value >= right, "<=": value <= right, "==": value === right, "!=": value !== right })[op]; } return value; }
  const result = comparison();
  if (index !== tokens.length) throw new Error("Unexpected formula input");
  if (typeof result === "number" && !Number.isFinite(result)) return null;
  return result;
}

function extractDependencies(source) {
  return [...String(source || "").matchAll(/\[([^\]]+)\]/g)].map((match) => match[1].trim()).filter(Boolean);
}

function detectCircularDependencies(formulas) {
  const graph = new Map(Object.entries(formulas || {}).map(([name, formula]) => [name, extractDependencies(formula).filter((dependency) => formulas[dependency])]));
  const visiting = new Set(); const visited = new Set();
  function visit(node, path) {
    if (visiting.has(node)) return [...path, node];
    if (visited.has(node)) return null;
    visiting.add(node);
    for (const dependency of graph.get(node) || []) { const cycle = visit(dependency, [...path, node]); if (cycle) return cycle; }
    visiting.delete(node); visited.add(node); return null;
  }
  for (const node of graph.keys()) { const cycle = visit(node, []); if (cycle) return cycle; }
  return null;
}

module.exports = { detectCircularDependencies, evaluateFormula, extractDependencies, tokenize };
