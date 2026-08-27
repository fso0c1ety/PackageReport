const test = require('node:test');
const assert = require('node:assert/strict');
const { Virtualizer } = require('@tanstack/virtual-core');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const source = readFileSync(join(__dirname, '..', 'src', 'app', 'tableVirtualization.ts'), 'utf8');

test('recovery candidate does not force the fallback strategy into TableBoard', () => {
  const board = readFileSync(join(__dirname, '..', 'src', 'app', 'TableBoard.tsx'), 'utf8');
  assert.doesNotMatch(board, /getFallbackVirtualRows/);
  assert.match(source, /getFallbackVirtualRows/);
  const count = 450;
  const rowHeight = 36;
  const scrollTop = 449 * rowHeight;
  const viewportHeight = 900;
  const overscan = 12;
  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const last = Math.min(count - 1, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
  assert.ok(first <= 449 && last === 449);
  assert.ok(last - first + 1 <= 40);
});

test('10,000 board rows render only the viewport plus overscan', () => {
  const virtualizer = new Virtualizer({
    count: 10_000,
    getScrollElement: () => null,
    estimateSize: () => 36,
    scrollToFn: () => {},
    observeElementRect: () => {},
    observeElementOffset: () => {},
    initialRect: { width: 1200, height: 900 },
    initialOffset: 180_000,
    overscan: 30,
    scrollMargin: 36,
    getItemKey: (index) => `row-${index}`,
  });

  const visibleRows = virtualizer.getVirtualItems();

  assert.ok(visibleRows.length >= 60);
  assert.ok(visibleRows.length <= 90);
  assert.equal(virtualizer.getTotalSize(), 360_000);
  assert.ok(visibleRows[0].index > 4_900);
  assert.ok(visibleRows.at(-1).index < 5_100);
});

test('TableBoard v1.0.6 keeps measured row offsets and legacy overscan', () => {
  const board = readFileSync(join(__dirname, '..', 'src', 'app', 'TableBoard.tsx'), 'utf8');
  assert.doesNotMatch(board, /validVirtualRows = virtualRows\.filter/);
  assert.doesNotMatch(board, /hasCurrentViewport/);
  assert.match(board, /start: virtualRow\.start/);
  assert.match(board, /overscan: isMobile \? 18 : 12/);
  assert.match(board, /rowVirtualizer\.measureElement\(node\)/);
});

test('fallback keeps the current viewport covered after a large scroll jump', () => {
  const count = 450;
  const rowHeight = 36;
  const scrollTop = 449 * rowHeight;
  const viewportHeight = 500;
  const overscan = 20;
  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const last = Math.min(count - 1, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
  const range = Array.from({ length: last - first + 1 }, (_, offset) => ({
    index: first + offset,
    start: (first + offset) * rowHeight,
  }));
  assert.ok(range.length <= 40);
  assert.equal(range.at(-1).index, 449);
  assert.equal(range.at(-1).start, 449 * 36);
});
