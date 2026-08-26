export type FallbackVirtualRow = { index: number; start: number };

/**
 * TanStack can briefly report no items while a scroll container is being
 * measured (most commonly during a fast jump or an Electron resize). Keep a
 * small, deterministic range mounted until its next measurement rather than
 * exposing a blank viewport.
 */
export function getFallbackVirtualRows({
  count,
  scrollTop,
  viewportHeight,
  rowHeight,
  overscan,
}: {
  count: number;
  scrollTop: number;
  viewportHeight: number;
  rowHeight: number;
  overscan: number;
}): FallbackVirtualRow[] {
  if (count <= 0 || rowHeight <= 0) return [];
  const safeScrollTop = Math.max(0, Number.isFinite(scrollTop) ? scrollTop : 0);
  const safeViewport = Math.max(rowHeight, Number.isFinite(viewportHeight) ? viewportHeight : rowHeight);
  const first = Math.max(0, Math.floor(safeScrollTop / rowHeight) - overscan);
  const last = Math.min(count - 1, Math.ceil((safeScrollTop + safeViewport) / rowHeight) + overscan);
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, offset) => {
    const index = first + offset;
    return { index, start: index * rowHeight };
  });
}
