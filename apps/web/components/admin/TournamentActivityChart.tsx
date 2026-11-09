import type { AdminOverview } from "@padel/shared";
import { Link } from "react-router-dom";
import { adminLink } from "../../lib/admin/reportFilters";
import { AppDbBadge, Cell, ReportTable } from "./ReportParts";

const axisDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Accra" });
const series = [
  { key: "tournamentsCreated", label: "Created", color: "var(--color-padel-primary)" },
  { key: "tournamentsCompleted", label: "Completed", color: "var(--admin-chart-completed)" }
] as const;

export function TournamentActivityChart({ daily, range }: { daily: AdminOverview["daily"]; range: AdminOverview["range"] }) {
  const left = 48;
  const top = 16;
  const plotHeight = 152;
  const baseline = top + plotHeight;
  const width = Math.max(520, left + daily.length * 24 + 12);
  const plotWidth = width - left - 12;
  const spacing = plotWidth / Math.max(1, daily.length);
  const barWidth = Math.min(22, spacing * 0.29);
  const maximum = Math.max(0, ...daily.flatMap((day) => series.map(({ key }) => day[key] ?? 0)));
  const tickStep = Math.max(1, Math.ceil(maximum / 4));
  const labelInterval = Math.max(1, Math.ceil(64 / spacing));
  const hasCompletionData = daily.every((day) => day.tournamentsCompleted !== undefined);

  return (
    <section className="admin-panel min-w-0" aria-label="Tournament activity">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Tournament activity</h2>
        <AppDbBadge />
      </div>
      <p className="text-sm text-padel-muted">Created and completed per day · retained records · Accra</p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-padel-muted" aria-label="Chart legend">
        {series.map(({ key, label, color }) => (
          <li key={key} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </li>
        ))}
      </ul>
      <div className="mt-2 overflow-x-auto" role="region" aria-label="Daily tournament chart" tabIndex={0}>
        <svg aria-hidden="true" viewBox={`0 0 ${width} 200`} className="block h-auto w-full"
          style={daily.length > 14 ? { minWidth: width } : undefined}>
          {[0, 1, 2, 3, 4].map((tick) => {
            const y = baseline - (tick * plotHeight) / 4;
            return (
              <g key={tick}>
                <text x={left - 8} y={y + 4} textAnchor="end" className="fill-padel-muted text-[17px] tabular-nums sm:text-xs">
                  {(tick * tickStep).toLocaleString()}
                </text>
                <line x1={left} x2={width - 12} y1={y} y2={y} className="stroke-padel-border" />
              </g>
            );
          })}
          {daily.map((day, index) => {
            const x = left + (index + 0.5) * spacing;
            return (
              <g key={day.date}>
                {series.map(({ key, label, color }, i) => {
                  const count = day[key];
                  if (!count) return null;
                  const height = (count / (4 * tickStep)) * plotHeight;
                  return (
                    <rect key={key} x={i === 0 ? x - barWidth - 2 : x + 2} y={baseline - height}
                      width={barWidth} height={height} rx={2} fill={color}>
                      <title>{`${day.date} · ${label}: ${count.toLocaleString()}`}</title>
                    </rect>
                  );
                })}
                {index % labelInterval === 0 && (
                  <text x={x} y={baseline + 21} textAnchor="middle" className="fill-padel-muted text-[17px] sm:text-xs">
                    {axisDate.format(new Date(day.date))}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {!hasCompletionData && <p className="text-sm text-padel-muted">Completion counts are unavailable for this report.</p>}
      <details className="mt-2 text-sm">
        <summary className="font-semibold text-padel-primary">View daily data</summary>
        <div className="mt-3">
          <ReportTable title="Daily operations · Africa/Accra" columns={["Day", "Registered", "Guests", "Created", "Completed"]}>
            {daily.map((day) => {
              const midnight = Date.parse(day.date);
              const dayRange = new URLSearchParams({
                from: new Date(Math.max(midnight, Date.parse(range.from))).toISOString(),
                to: new Date(Math.min(midnight + 86_400_000, Date.parse(range.to))).toISOString()
              });
              return (
                <tr key={day.date}>
                  <Cell>{day.date}</Cell>
                  <Cell>{day.registeredAccountsCreated.toLocaleString()}</Cell>
                  <Cell>{day.guestAccountsCreated.toLocaleString()}</Cell>
                  {series.map(({ key, label }) => (
                    <Cell key={key}>
                      {day[key] === undefined ? "Unavailable" : (
                        <Link aria-label={`${day.date}: ${day[key]} ${label.toLowerCase()}`} to={adminLink(
                          "/admin/tournaments", dayRange, key === "tournamentsCompleted" ? { dateBy: "completed" } : {}
                        )}>
                          {day[key].toLocaleString()}
                        </Link>
                      )}
                    </Cell>
                  ))}
                </tr>
              );
            })}
          </ReportTable>
        </div>
      </details>
    </section>
  );
}
