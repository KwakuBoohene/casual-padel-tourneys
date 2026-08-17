import { useEffect, useMemo, useState } from "react";
import { standingsPageCount, standingsPageRange } from "@padel/shared";

export function usePagedSlice(itemCount: number, pageSize: number) {
  const pageCount = standingsPageCount(itemCount, pageSize);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

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
    goNext: () => setPageIndex((value) => Math.min(pageCount - 1, value + 1))
  };
}
