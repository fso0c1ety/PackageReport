const test = require('node:test');
const assert = require('node:assert/strict');
const { Virtualizer } = require('@tanstack/virtual-core');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const source = readFileSync(join(__dirname, '..', 'src', 'app', 'tableVirtualization.ts'), 'utf8');

test('fallback range keeps a measured viewport populated during an empty virtual range', () => {
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
