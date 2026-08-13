const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const test = require("node:test");

test("every official workspace template produces a complete, relational installation plan", () => {
  const templateUrl = pathToFileURL(path.resolve(__dirname, "..", "src", "workspaceTemplates.ts")).href;
  const engineUrl = pathToFileURL(path.resolve(__dirname, "..", "server", "services", "templateEngine.js")).href;
  const script = `
    const catalog = await import(${JSON.stringify(templateUrl)});
    const { createTemplatePlan } = await import(${JSON.stringify(engineUrl)});
    const failures = [];
    const summaries = [];
    for (const template of catalog.WORKSPACE_TEMPLATES) {
      const manifest = catalog.getWorkspaceTemplateManifest(template.key);
      const boardNames = new Set(manifest.boards.map((board) => board.name));
      if (boardNames.size !== manifest.boards.length) failures.push(template.key + ': duplicate board names');
      for (const board of manifest.boards) {
        const columnNames = board.columns.map((column) => column.name);
        if (new Set(columnNames).size !== columnNames.length) failures.push(template.key + '/' + board.name + ': duplicate columns');
        for (const column of board.columns.filter((entry) => entry.type === 'Relation')) {
          if (!boardNames.has(column.settings?.relationBoard)) failures.push(template.key + '/' + board.name + '/' + column.name + ': missing relation target');
        }
      }
      for (const view of manifest.views) if (!boardNames.has(view.boardName)) failures.push(template.key + ': broken view ' + view.name);
      for (const automation of manifest.automations) if (automation.board && !boardNames.has(automation.board)) failures.push(template.key + ': broken automation board ' + automation.board);
      if (!manifest.dashboards.length || !manifest.dashboards.every((dashboard) => dashboard.widgets?.length)) failures.push(template.key + ': invalid dashboard');
      if (!manifest.roles.length || new Set(manifest.roles.map((role) => role.key)).size !== manifest.roles.length) failures.push(template.key + ': invalid roles');
      let sequence = 0;
      const withoutSamples = createTemplatePlan(manifest, { idFactory: () => template.key + '-empty-' + (++sequence), includeSampleData: false });
      const withSamples = createTemplatePlan(manifest, { idFactory: () => template.key + '-sample-' + (++sequence), includeSampleData: true });
      if (withoutSamples.boards.some((board) => board.rows.length)) failures.push(template.key + ': sample data leaked into empty workspace');
      if (template.key !== 'blank' && withSamples.boards.some((board) => !board.rows.length)) failures.push(template.key + ': incomplete sample data');
      const plannedBoardIds = new Set(withSamples.boards.map((board) => board.id));
      if (withSamples.views.some((view) => !plannedBoardIds.has(view.tableId))) failures.push(template.key + ': view plan references missing board');
      summaries.push(template.key);
    }
    console.log(JSON.stringify({ count: summaries.length, failures, catalog: catalog.WORKSPACE_TEMPLATE_CATALOG_STATUS }));
  `;
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
  assert.equal(output.count, 44);
  assert.deepEqual(output.catalog, { valid: true, errors: [], count: 44 });
  assert.deepEqual(output.failures, []);
});
