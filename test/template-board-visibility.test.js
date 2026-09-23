import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(".");
const workspaceSource = fs.readFileSync(
  path.join(root, "src/app/(dashboard)/workspace/page.tsx"),
  "utf8",
);

test("fleet template keeps all seven logistics boards visible", async () => {
  const { getWorkspaceTemplateManifest } = await import(
    pathToFileURL(path.join(root, "src/workspaceTemplates.ts")).href,
  );
  const manifest = getWorkspaceTemplateManifest("fleet_management");
  const enabledModules = manifest.modules;
  const boards = ["Trucks", "Drivers", "Trips", "Fuel", "Maintenance", "Expenses", "Documents"];
  const visible = boards.filter((name) => {
    const required = /truck|driver|trip|vehicle|fleet|fuel/i.test(name)
      ? "fleet"
      : /maintenance|service|repair|oil|tire|insurance|registration|tachograph/i.test(name)
        ? "maintenance"
        : /invoice|expense|payment|revenue|finance|account/i.test(name)
          ? "finance"
          : /document|file|pod|contract/i.test(name) ? "documents" : undefined;
    return !required || enabledModules.includes(required) ||
      (["fleet", "maintenance"].includes(required) && enabledModules.includes("logistics"));
  });
  assert.deepEqual(visible, boards);
  assert.match(workspaceSource, /logisticsBoard/);
  assert.match(workspaceSource, /enabledModules\.includes\("logistics"\)/);
});

