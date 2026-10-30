import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/** Maximum content width, so grids stay centered on large screens. */
export const MAX_CONTENT_WIDTH = 1200;

/** Number of columns for the screen width. `minItemWidth` is the width below which an item becomes too small. */
export function useColumns(minItemWidth: number, maxColumns: number): number {
  const { width } = useWindowDimensions();
  const usable = Math.min(width, MAX_CONTENT_WIDTH);
  return Math.max(1, Math.min(maxColumns, Math.floor(usable / minItemWidth)));
}

/** Fills the last row with empty cells (`null`). Cells share the row equally, so they all keep the same width. */
export function useFilledRows<T>(items: readonly T[], columns: number): (T | null)[] {
  return useMemo(() => {
    const missing = (columns - (items.length % columns)) % columns;
    return [...items, ...Array<null>(missing).fill(null)];
  }, [items, columns]);
}
