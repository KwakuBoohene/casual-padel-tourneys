"use client";

import { useState } from "react";
import { STANDINGS_COLUMNS } from "@padel/shared";

import { useStandingsColumns } from "./StandingsColumnsProvider";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-padel-primary " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-padel-background";

/** Choose which stat columns the standings table shows. Stored per browser. */
export function StandingsColumnsControl() {
  const { visible, toggle, reset } = useStandingsColumns();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Choose leaderboard columns"
        className={[
          "inline-flex min-h-11 items-center rounded-full border border-padel-border",
          "bg-padel-surface px-4 text-sm font-semibold text-padel-text transition",
          FOCUS_RING
        ].join(" ")}
      >
        Columns
      </button>

      {open ? (
        <div
          role="group"
          aria-label="Leaderboard columns"
          className={[
            "absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-padel-border",
            "bg-padel-surface p-3 shadow-lg"
          ].join(" ")}
        >
          <p className="mb-2 px-1 text-xs text-padel-muted">
            Shown on this device. Exports always include every column.
          </p>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {STANDINGS_COLUMNS.map((column) => {
              const checked = visible.includes(column.key);
              return (
                <li key={column.key}>
                  <label
                    className={[
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2",
                      "text-sm hover:bg-padel-background"
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(column.key)}
                      className={["h-4 w-4 accent-padel-primary", FOCUS_RING].join(" ")}
                    />
                    <span className="w-12 font-bold text-padel-text">{column.header}</span>
                    <span className="flex-1 truncate text-padel-muted">{column.title}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={reset}
              className={[
                "min-h-11 flex-1 rounded-xl border border-padel-border px-3 text-sm",
                "font-semibold text-padel-text",
                FOCUS_RING
              ].join(" ")}
            >
              Reset to default
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={[
                "min-h-11 flex-1 rounded-xl bg-padel-primary px-3 text-sm font-semibold",
                "text-padel-background",
                FOCUS_RING
              ].join(" ")}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
