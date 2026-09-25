const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'TableBoard.tsx'), 'utf8');

test('status/dropdown placement is refined after the picker opens', () => {
  assert.match(source, /const \[statusPopoverUpward, setStatusPopoverUpward\] = useState\(false\)/);
  assert.match(source, /anchor\.getBoundingClientRect\(\)\.bottom/);
  assert.match(source, /React\.useEffect\(\(\) => \{/);
  assert.match(source, /const dropdownShouldOpenUpward = statusPopoverUpward/);
  assert.match(source, /const statusShouldOpenUpward = statusPopoverUpward/);
});

test('status click does not perform a network request before opening', () => {
  const statusBranch = source.slice(source.indexOf('if (effectiveType === "Status")'), source.indexOf('if (effectiveType === "Dropdown")'));
  assert.doesNotMatch(statusBranch, /authenticatedFetch|getApiUrl/);
  assert.match(statusBranch, /onClick=\{activate\}/);
});

test('opening a cell picker does not invalidate every virtual row', () => {
  assert.match(source, /rowStyleSignature: string/);
  assert.match(source, /previous\.rowStyleSignature === next\.rowStyleSignature/);
  assert.match(source, /const rowStyleSignature = React\.useMemo/);
  assert.match(source, /rowStyleSignature=\{rowStyleSignature\}/);
  assert.match(source, /&& !previous\.isInteractive\n\s*&& !next\.isInteractive/);
  assert.doesNotMatch(source, /previous\.displayRenderer === next\.displayRenderer/);
  assert.match(source, /const openCellPopover = React\.useCallback/);
  assert.match(source, /anchor\.getBoundingClientRect\(\)\.bottom/);
  assert.doesNotMatch(source, /Open pickers immediately; refine their direction after the first paint/);
  assert.doesNotMatch(source, /setStatusPopoverUpward\(e\.currentTarget\.getBoundingClientRect/);
  assert.ok((source.match(/transitionDuration=\{0\}/g) || []).length >= 4);
});

test('picker direction is measured in the interaction update, not a follow-up effect', () => {
  const stateOffset = source.indexOf('const [statusAnchor');
  const handlerOffset = source.indexOf('const openCellPopover', stateOffset);
  const afterHandler = source.slice(handlerOffset, source.indexOf('// --- Fetch columns', handlerOffset));
  assert.match(afterHandler, /setStatusPopoverUpward\(nextUpward\)/);
  assert.match(afterHandler, /setStatusAnchor\(anchor\)/);
  assert.doesNotMatch(afterHandler, /useEffect/);
});

test('discussion renders cached row messages before background revalidation', () => {
  const chatOffset = source.indexOf('const handleOpenChat =');
  const chatSource = source.slice(chatOffset, source.indexOf('const handleSendChat', chatOffset));
  assert.match(chatSource, /setChatMessages\(Array\.isArray\(messages\) \? messages : \[\]\)/);
  assert.match(chatSource, /background revalidation/);
  assert.match(chatSource, /chatRequestIdRef\.current !== requestId/);
  assert.match(chatSource, /\.catch\(\(\) =>/);
  assert.match(chatSource, /chatRevalidationRef\.current/);
  assert.match(chatSource, /Date\.now\(\) - existingRevalidation\.startedAt < 1_000/);
  assert.match(chatSource, /void revalidation\.promise\.then/);
});

test('country picker virtualizes the static country option list', () => {
  assert.match(source, /const VirtualizedCountryListbox = React\.forwardRef/);
  assert.match(source, /estimateSize: \(\) => 42/);
  assert.match(source, /overscan: 6/);
  assert.match(source, /aria-hidden="true"[\s\S]*height: totalSize/);
  assert.match(source, /safeVirtualOptions = virtualOptions\.length > 0/);
  assert.match(source, /slots=\{\{ listbox: VirtualizedCountryListbox \}\}/);
});

test('people picker reuses table members and augments them from workspace membership', () => {
  assert.match(source, /<PeopleSelector[\s\S]*initialPeople=\{tableMembers\}/);
  const peopleSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'PeopleSelector.tsx'), 'utf8');
  assert.match(peopleSource, /initialPeople\?: Person\[\]/);
  assert.match(peopleSource, /workspaceId\?: string \| null/);
  assert.match(peopleSource, /getApiUrl\('\/teammates'\)/);
});

test('board startup does not fetch workspace people until the people picker opens', () => {
  const peopleSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'PeopleSelector.tsx'), 'utf8');
  const initialization = peopleSource.slice(
    peopleSource.indexOf('// Keep the already-loaded board members available immediately.'),
    peopleSource.indexOf('const loadPeopleForPicker'),
  );
  assert.doesNotMatch(initialization, /authenticatedFetch/);
  assert.match(peopleSource, /const loadPeopleForPicker = React\.useCallback/);
  assert.match(peopleSource, /void loadPeopleForPicker\(\)/);
});

test('table member reads are briefly cached across repeated board switches', () => {
  const membersEffect = source.slice(source.indexOf('// Fetch table members'), source.indexOf('// People options for Automation'));
  assert.match(membersEffect, /getApiUrl\(`\/tables\/\$\{tableId\}\/members`\)/);
  assert.match(membersEffect, /responseCacheTtlMs: 60_000/);
});

test('invoice branding stays off the board-startup request path', () => {
  const brandingEffect = source.slice(source.indexOf('Invoice branding is only consumed'), source.indexOf('// Column menu'));
  assert.match(brandingEffect, /if \(!tableId \|\| !isInvoiceDialogOpen\) return/);
  assert.match(brandingEffect, /getApiUrl\(`\/tables\/\$\{tableId\}\/invoice-branding`\)/);
  assert.match(brandingEffect, /responseCacheTtlMs: 60_000/);
});
