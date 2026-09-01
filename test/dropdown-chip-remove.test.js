import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("dropdown chip deletion stops parent activation and removes only its value", () => {
  const source = fs.readFileSync(new URL("../src/app/TableBoard.tsx", import.meta.url), "utf8");
  assert.match(source, /onDelete=\{\(event\) => \{ event\.preventDefault\(\); event\.stopPropagation\(\); handleDropdownOptionSelect\(entry\); \}\}/);
});
