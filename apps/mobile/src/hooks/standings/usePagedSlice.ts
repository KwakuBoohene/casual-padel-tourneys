import { useMemo, useState } from "react";
import { standingsPageCount, standingsPageRange } from "@padel/shared";

export function usePagedSlice(itemCount: number, pageSize: number) {
  const pageCount = standingsPageCount(itemCount, pageSize);
  const [pageIndex, setPageIndex] = useState(0);

  // Clamp during render when the list shrinks, so an out-of-range page is never shown.
  if (pageIndex > pageCount - 1) {
    setPageIndex(pageCount - 1);
  }

  const range = useMemo(
    () => standingsPageRange(itemCount, pageIndex, pageSize),
    [itemCount, pageIndex, pageSize]
  );

  return {
    pageIndex,
    pageCount,
    pageStart: range.start,
    pageEnd: range.end,
    canGoPrev: pageIndex > 0,
    canGoNext: pageIndex < pageCount - 1,
    goPrev: () => setPageIndex((value) => Math.max(0, value - 1)),
    goNext: () => setPageIndex((value) => Math.min(pageCount - 1, value + 1)),
    /** Back to page 1 — reordering the list makes the current page meaningless. */
    reset: () => setPageIndex(0)
  };
}
