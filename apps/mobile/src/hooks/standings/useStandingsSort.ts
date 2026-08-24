import { useCallback, useMemo, useState } from "react";
import {
  compareByStandingsColumn,
  type StandingsColumnKey,
  type StandingsLine,
  type StandingsSortDirection
} from "@padel/shared";

export interface StandingsSortState {
  key: StandingsColumnKey;
  direction: StandingsSortDirection;
}

interface SortableRow {
  line: StandingsLine;
}

/**
 * The press cycle for one column: ascending, then descending, then back to `null` — the board's own
 * rank order. Three presses always return an organizer to where they started, so a sort can be
 * undone without hunting for a reset control. Pressing a different column starts its own cycle.
 */
export function nextSortState(
  current: StandingsSortState | null,
  key: StandingsColumnKey
): StandingsSortState | null {
  if (!current || current.key !== key) return { key, direction: "asc" };
  if (current.direction === "asc") return { key, direction: "desc" };
  return null;
}

/**
 * Apply a sort, leaving the input untouched. `null` means the caller's existing order.
 *
 * Array#sort is stable, so rows with equal values — including a whole column of unavailable win
 * rates early in an event — keep their rank order instead of reshuffling.
 */
export function sortStandingsRows<T extends SortableRow>(
  rows: T[],
  sort: StandingsSortState | null
): T[] {
  if (!sort) return rows;
  const compare = compareByStandingsColumn(sort.key, sort.direction);
  return [...rows].sort((a, b) => compare(a.line, b.line));
}

/**
 * Sort state for a standings table. Rows keep the `rank` their caller assigned, so the `#` column
 * always shows a player's true standing rather than their position in the current view.
 */
export function useStandingsSort<T extends SortableRow>(rows: T[], onSortChange?: () => void) {
  const [sort, setSort] = useState<StandingsSortState | null>(null);

  const pressColumn = useCallback(
    (key: StandingsColumnKey) => {
      setSort((current) => nextSortState(current, key));
      onSortChange?.();
    },
    [onSortChange]
  );

  const sorted = useMemo(() => sortStandingsRows(rows, sort), [rows, sort]);

  return { sort, sorted, pressColumn };
}
