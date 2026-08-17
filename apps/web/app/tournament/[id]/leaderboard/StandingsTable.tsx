import {
  STANDINGS_COLUMNS,
  standingsCells,
  type StandingsLine
} from "@padel/shared";

export type WebStandingsRow = {
  id: string;
  rank: number;
  name: string;
  line: StandingsLine;
};

export function WebStandingsTable(props: { rows: WebStandingsRow[] }) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-padel-border bg-padel-surface">
        <table className="w-full min-w-[372px] text-sm">
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
            {props.rows.map((row) => {
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
    </div>
  );
}
