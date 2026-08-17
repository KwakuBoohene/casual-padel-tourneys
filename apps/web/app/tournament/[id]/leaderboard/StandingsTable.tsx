"use client";

import { useEffect, useState } from "react";
import {
  STANDINGS_COLUMNS,
  standingsCells,
  standingsPageCount,
  standingsPageRange,
  standingsPageSize,
  type StandingsLine
} from "@padel/shared";

export type WebStandingsRow = {
  id: string;
  rank: number;
  name: string;
  line: StandingsLine;
};

export function WebStandingsTable(props: { rows: WebStandingsRow[] }) {
  const [pageSize, setPageSize] = useState(8);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    const read = () => setPageSize(standingsPageSize(window.innerWidth, window.innerHeight));
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  const pageCount = standingsPageCount(props.rows.length, pageSize);
  const safeIndex = Math.min(pageIndex, pageCount - 1);
  const range = standingsPageRange(props.rows.length, safeIndex, pageSize);
  const visible = props.rows.slice(range.start, range.end);
  const from = props.rows.length === 0 ? 0 : range.start + 1;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-padel-border bg-padel-surface">
        <table className="w-full min-w-[456px] text-sm">
          <thead>
            <tr className="border-b border-padel-border text-[10px] font-semibold tracking-wide text-padel-muted">
              <th className="px-3 py-2 text-left font-semibold w-8">#</th>
              <th className="px-2 py-2 text-left font-semibold">Player</th>
              {STANDINGS_COLUMNS.map((col) => (
                <th key={col.key} title={col.title} className="px-1.5 py-2 text-right font-semibold">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const cells = standingsCells(row.line);
              return (
                <tr key={row.id} className="border-t border-padel-border">
                  <td className="px-3 py-3 text-padel-muted font-bold">{row.rank}</td>
                  <td className="px-2 py-3 font-semibold text-padel-text truncate max-w-[10rem]">{row.name}</td>
                  {STANDINGS_COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={[
                        "px-1.5 py-3 text-right tabular-nums",
                        col.key === "gd" || col.key === "pts" ? "font-bold text-padel-text" : "text-padel-muted"
                      ].join(" ")}
                    >
                      {cells[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-padel-muted">
            {from}–{range.end} of {props.rows.length}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safeIndex === 0}
              onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
              className="min-h-12 min-w-[4.5rem] rounded-xl border border-padel-border bg-padel-surface px-3 text-sm font-semibold text-padel-text disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={safeIndex >= pageCount - 1}
              onClick={() => setPageIndex((value) => Math.min(pageCount - 1, value + 1))}
              className="min-h-12 min-w-[4.5rem] rounded-xl border border-padel-border bg-padel-surface px-3 text-sm font-semibold text-padel-text disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
