import { useEffect, useMemo, useState } from "react";

export const PLAYERS_PER_PAGE = 5;

export function usePlayerPages(playerCount: number) {
  const pageCount = Math.max(1, Math.ceil(Math.max(playerCount, 1) / PLAYERS_PER_PAGE));
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  const range = useMemo(() => {
    const start = pageIndex * PLAYERS_PER_PAGE;
    const end = Math.min(start + PLAYERS_PER_PAGE, playerCount);
    return { start, end };
  }, [pageIndex, playerCount]);

  return {
    pageIndex,
    pageCount,
    pageStart: range.start,
    pageEnd: range.end,
    canGoPrevPage: pageIndex > 0,
    canGoNextPage: pageIndex < pageCount - 1,
    goPrevPage: () => setPageIndex((value) => Math.max(0, value - 1)),
    goNextPage: () => setPageIndex((value) => Math.min(pageCount - 1, value + 1)),
    goToLastPage: () => setPageIndex(Math.max(0, pageCount - 1)),
    goToLastPageForCount: (count: number) => {
      const pages = Math.max(1, Math.ceil(Math.max(count, 1) / PLAYERS_PER_PAGE));
      setPageIndex(pages - 1);
    },
    setPageIndex
  };
}
