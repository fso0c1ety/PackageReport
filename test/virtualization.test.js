const test = require('node:test');
const assert = require('node:assert/strict');
const { Virtualizer } = require('@tanstack/virtual-core');

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
