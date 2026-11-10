import type { AdminOverview } from "@padel/shared";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { adminLink } from "../../lib/admin/reportFilters";
import { AppDbBadge, Cell, ReportTable } from "./ReportParts";

const axisDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Accra" });
function formatAxisDate(date: string): string {
  return axisDate.format(new Date(date));
}

const series = [
  { key: "tournamentsCreated", label: "Created", color: "var(--color-padel-primary)" },
  { key: "tournamentsCompleted", label: "Completed", color: "var(--admin-chart-completed)" }
] as const;

export function TournamentActivityChart({ daily, range }: { daily: AdminOverview["daily"]; range: AdminOverview["range"] }) {
  const chartWidth = Math.max(520, 60 + daily.length * 24);
  const [width, setWidth] = useState(520);
  const scale = width / chartWidth;
  const axisTick = { fill: "var(--color-padel-muted)", fontSize: Math.max(10, 12 * scale) };
  const maximum = Math.max(0, ...daily.flatMap((day) => series.map(({ key }) => day[key] ?? 0)));
  const tickStep = Math.max(1, Math.ceil(maximum / 4));
  const ticks = [0, 1, 2, 3, 4].map((tick) => tick * tickStep);
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
        <div aria-hidden="true" style={daily.length > 14 ? { minWidth: chartWidth } : undefined}>
          <ResponsiveContainer width="100%" aspect={chartWidth / 200} onResize={(nextWidth) => setWidth(nextWidth)}>
            <BarChart
              data={daily}
              margin={{ top: 16 * scale, right: 12 * scale, bottom: 0, left: 0 }}
              barGap={4 * scale}
              barCategoryGap="18%"
              maxBarSize={22 * scale}
              accessibilityLayer={false}
            >
              <CartesianGrid vertical={false} syncWithTicks stroke="var(--color-padel-border)" />
              <XAxis
                dataKey="date"
                tick={axisTick}
                tickFormatter={formatAxisDate}
                axisLine={false}
                tickLine={false}
                tickMargin={8 * scale}
                height={32 * scale}
                minTickGap={5}
              />
              <YAxis
                domain={[0, 4 * tickStep]}
                ticks={ticks}
                tick={axisTick}
                tickFormatter={(value: number) => value.toLocaleString()}
                axisLine={false}
                tickLine={false}
                tickMargin={8 * scale}
                width={48 * scale}
              />
              <Tooltip
                cursor={false}
                isAnimationActive={false}
                labelFormatter={(date) => typeof date === "string" ? formatAxisDate(date) : date}
                formatter={(value) => typeof value === "number" ? value.toLocaleString() : value}
                contentStyle={{
                  background: "var(--color-padel-surface)",
                  border: "1px solid var(--color-padel-border)",
                  borderRadius: "0.5rem",
                  color: "var(--color-padel-text)",
                  fontSize: "0.875rem"
                }}
              />
              {series.map(({ key, label, color }) => (
                <Bar key={key} dataKey={key} name={label} fill={color} radius={2 * scale} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
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
