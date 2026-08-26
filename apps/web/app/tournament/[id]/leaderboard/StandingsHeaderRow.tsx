"use client";

import {
  visibleStandingsColumns,
  type StandingsColumnKey,
  type StandingsSortState
} from "@padel/shared";

/** Same ring the range tabs use, so keyboard focus looks the same across the viewer. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-padel-primary " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-padel-background";

const CARET = { asc: "\u25B2", desc: "\u25BC" } as const;

export function ariaSortFor(sort: StandingsSortState | null, key: StandingsColumnKey) {
  if (sort?.key !== key) return "none" as const;
  return sort.direction === "asc" ? ("ascending" as const) : ("descending" as const);
}

/**
 * The standings header. Every stat column is a real `<button>` inside a `<th>`, so it is keyboard
 * operable for free and screen readers get `aria-sort` describing the current order.
 */
export function StandingsHeaderRow(props: {
  visible: StandingsColumnKey[];
  sort: StandingsSortState | null;
  onPressColumn: (key: StandingsColumnKey) => void;
}) {
  return (
    <tr className="border-b border-padel-border text-[10px] font-semibold tracking-wide text-padel-muted">
      <th scope="col" className="px-3 py-2 text-left font-semibold w-8">
        #
      </th>
      <th scope="col" className="px-2 py-2 text-left font-semibold">
        Player
      </th>
      {visibleStandingsColumns(props.visible).map((col) => {
        const active = props.sort?.key === col.key ? props.sort : null;
        return (
          <th
            key={col.key}
            scope="col"
            aria-sort={ariaSortFor(props.sort, col.key)}
            className="px-1.5 py-2 text-right font-semibold"
          >
            <button
              type="button"
              onClick={() => props.onPressColumn(col.key)}
              title={col.title}
              aria-label={
                active
                  ? `${col.title}, sorted ${ariaSortFor(props.sort, col.key)}`
                  : `Sort by ${col.title}`
              }
              className={[
                "w-full rounded text-right font-semibold",
                active ? "text-padel-primary" : "text-padel-muted hover:text-padel-text",
                FOCUS_RING
              ].join(" ")}
            >
              {col.header}
              {active ? CARET[active.direction] : ""}
            </button>
          </th>
        );
      })}
    </tr>
  );
}
