import { useCallback, useMemo, useState } from "react";
import {
  nextSortState,
  sortStandingsRows,
  type StandingsColumnKey,
  type StandingsLine
} from "@padel/shared";

interface SortableRow {
  line: StandingsLine;
}

/**
 * Sort state for a standings table.
 *
 * The cycle and the ordering both live in `@padel/shared`, so this hook is only the React wiring —
 * mobile and web cannot end up with different behaviour for the same table.
 *
 * Rows keep the `rank` their caller assigned, so the `#` column always shows a player's true
 * standing rather than their position in the current view.
 */
export function useStandingsSort<T extends SortableRow>(rows: T[], onSortChange?: () => void) {
  const [sort, setSort] = useState<ReturnType<typeof nextSortState>>(null);

  const pressColumn = useCallback(
    (key: StandingsColumnKey) => {
      setSort((current) => nextSortState(current, key));
      onSortChange?.();
    },
    [onSortChange]
  );

  const sorted = useMemo(() => sortStandingsRows(rows, sort), [rows, sort]);

  /** Used when the sorted column is hidden — see `sortAfterHiding`. */
  const clearSort = useCallback(() => setSort(null), []);

  return { sort, sorted, pressColumn, clearSort };
}
