import React from "react";
import type { Column } from "../../../types";

export function useResponsiveColumnWidth(isMobile: boolean) {
  return React.useCallback((col: Column, isPrimary = false) => {
    if (!isMobile) {
      return col.width || 220;
    }

    const scale = 0.8;
    const minWidth = 140;
    const maxWidth = 260;
    const computedWidth = col.width ? Math.round(col.width * scale) : minWidth;

    return Math.max(minWidth, Math.min(maxWidth, computedWidth));
  }, [isMobile]);
}
