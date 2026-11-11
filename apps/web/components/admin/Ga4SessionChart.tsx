import type { Ga4ViewerReport } from "@padel/shared";
import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { sessionTrend } from "../../lib/admin/ga4Presentation";
import { Cell, ReportTable } from "./ReportParts";
import { Ga4Badge } from "./Ga4Parts";

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Accra" }).format(
    new Date(date)
  );
export function Ga4SessionChart({ data, provisional, organizer = false }: {
  data: Pick<Ga4ViewerReport, "daily" | "previousDaily">;
  provisional?: boolean;
  organizer?: boolean;
}) {
  const points = sessionTrend(data);
  return (
    <section className="admin-panel min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{organizer ? "Organizer usage over time" : "Sessions over time"}</h2>
        <Ga4Badge />
      </div>
      <p className="text-xs text-padel-muted">
        Daily sessions compared with the equal-length prior period · Accra
      </p>
      <ul aria-label="Chart legend" className="my-3 flex flex-wrap gap-4 text-xs text-padel-muted">
        <li>
          <span className="ga4-dot" />
          This period
        </li>
        <li>
          <span className="ga4-dot ga4-dot-prior" />
          Previous period (aligned by day)
        </li>
      </ul>
      <div aria-hidden="true" className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={points}
            margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
            accessibilityLayer={false}
          >
            <CartesianGrid vertical={false} stroke="var(--color-padel-border)" />
            <XAxis
              dataKey="date"
              tickFormatter={dayLabel}
              tick={{ fill: "var(--color-padel-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--color-padel-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              labelFormatter={(date) => (typeof date === "string" ? dayLabel(date) : date)}
              contentStyle={{
                background: "var(--color-padel-surface)",
                color: "var(--color-padel-text)",
                border: "1px solid var(--color-padel-border)",
                borderRadius: 8
              }}
            />
            <Area
              type="linear"
              dataKey="sessions"
              name="This period"
              stroke="var(--admin-ga4)"
              fill={organizer ? "var(--admin-ga4-badge)" : "var(--admin-ga4)"}
              fillOpacity={organizer ? 1 : 0.14}
              dot={organizer ? { r: 3, fill: "var(--color-padel-surface)", strokeWidth: 2 } : false}
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="previous"
              name="Previous period"
              stroke="var(--color-padel-muted)"
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {!data.previousDaily && (
        <p className="text-sm text-padel-muted">
          Previous-period daily sessions unavailable. Update the reporting API to show the comparison trend.
        </p>
      )}
      {provisional && <p className="text-right text-xs text-padel-muted">Recent days provisional</p>}
      <details className="mt-3 text-sm">
        <summary className="font-semibold text-padel-primary">View daily session values</summary>
        <ReportTable
          title={organizer ? "Daily Organizer web sessions" : "Daily Viewer sessions"}
          columns={["Day", "Sessions", "Prior day", "Prior sessions"]}
          compact
        >
          {points.map((point) => (
            <tr key={point.date}>
              <Cell>{point.date}</Cell>
              <Cell>{point.sessions.toLocaleString()}</Cell>
              <Cell>{point.previousDate ?? "Unavailable"}</Cell>
              <Cell>{point.previous?.toLocaleString() ?? "Unavailable"}</Cell>
            </tr>
          ))}
        </ReportTable>
      </details>
    </section>
  );
}
