type FormulaContext = { values: Record<string, unknown> };

type Token = { type: string; value: string | number };

function tokens(source: string): Token[] {
  const result: Token[] = [];
  const pattern = /\s*(?:([0-9]+(?:\.[0-9]+)?)|(\[[^\]]+\])|([A-Za-z_][A-Za-z0-9_]*)|(>=|<=|!=|==|[+\-*/%(),<>]))/gy;
  let offset = 0;
  while (offset < source.length) {
    pattern.lastIndex = offset;
    const match = pattern.exec(source);
    if (!match) throw new Error("Invalid formula");
    offset = pattern.lastIndex;
    if (match[1]) result.push({ type: "number", value: Number(match[1]) });
    else if (match[2]) result.push({ type: "reference", value: match[2].slice(1, -1).trim() });
    else if (match[3]) result.push({ type: "identifier", value: match[3].toUpperCase() });
    else result.push({ type: match[4], value: match[4] });
  }
  return result;
}

export function evaluateBoardFormula(source: string, context: FormulaContext): number | boolean | null {
  const input = tokens(source.replace(/^=/, ""));
  let cursor = 0;
  const peek = () => input[cursor];
  const take = (type?: string) => {
    const token = input[cursor];
    if (!token || (type && token.type !== type)) throw new Error(`Expected ${type || "token"}`);
    cursor += 1;
    return token;
  };
  const functions: Record<string, (...args: unknown[]) => number | boolean> = {
    SUM: (...args) => args.map(Number).filter(Number.isFinite).reduce((a, b) => a + b, 0),
    AVG: (...args) => { const nums = args.map(Number).filter(Number.isFinite); return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; },
    MIN: (...args) => Math.min(...args.map(Number).filter(Number.isFinite)),
    MAX: (...args) => Math.max(...args.map(Number).filter(Number.isFinite)),
    COUNT: (...args) => args.filter((value) => value !== null && value !== undefined && value !== "").length,
    IF: (condition, yes, no) => Number(condition ? yes : no),
    AND: (...args) => args.every(Boolean),
    OR: (...args) => args.some(Boolean),
    ROUND: (value, digits = 0) => Number(Number(value).toFixed(Number(digits))),
    ABS: (value) => Math.abs(Number(value)),
  };
  function primary(): unknown {
    const token = peek();
    if (!token) throw new Error("Unexpected end");
    if (token.type === "number") return take().value;
    if (token.type === "reference") return context.values[String(take().value)] ?? 0;
    if (token.type === "identifier") {
      const name = String(take().value);
      if (name === "TRUE" || name === "FALSE") return name === "TRUE";
      take("("); const args: unknown[] = [];
      if (peek()?.type !== ")") { do { args.push(compare()); } while (peek()?.type === "," && take(",")); }
      take(")");
      if (!functions[name]) throw new Error(`Unsupported function ${name}`);
      return functions[name](...args);
    }
    if (token.type === "(") { take("("); const value = compare(); take(")"); return value; }
    if (token.type === "-") { take("-"); return -Number(primary()); }
    throw new Error("Unexpected token");
  }
  function multiply(): unknown { let value = primary(); while (["*", "/", "%"].includes(peek()?.type)) { const op = take().type; const right = Number(primary()); value = op === "*" ? Number(value) * right : op === "/" ? Number(value) / right : Number(value) % right; } return value; }
  function add(): unknown { let value = multiply(); while (["+", "-"].includes(peek()?.type)) { const op = take().type; const right = multiply(); value = op === "+" ? Number(value) + Number(right) : Number(value) - Number(right); } return value; }
  function compare(): unknown { let value = add(); while ([">", "<", ">=", "<=", "==", "!="].includes(peek()?.type)) { const op = take().type; const right = add(); if (op === ">") value = Number(value) > Number(right); else if (op === "<") value = Number(value) < Number(right); else if (op === ">=") value = Number(value) >= Number(right); else if (op === "<=") value = Number(value) <= Number(right); else if (op === "==") value = value === right; else value = value !== right; } return value; }
  const value = compare();
  if (cursor !== input.length) throw new Error("Unexpected formula input");
  return typeof value === "number" && !Number.isFinite(value) ? null : value as number | boolean | null;
}
