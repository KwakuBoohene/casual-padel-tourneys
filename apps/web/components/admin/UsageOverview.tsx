import { useState } from "react";
import type { AdminReport, AdminUsage, UsageCounts } from "@padel/shared";
import { Link } from "react-router-dom";
import { adminLink, timestamp } from "../../lib/admin/reportFilters";
import { useAdminReport } from "./useAdminReport";
import { Cell, CoverageNotes, ReportState, ReportTable } from "./ReportParts";
import { ReportTooltip } from "./ReportTooltip";

export function UsageOverview({ range, revision }: { range: URLSearchParams; revision: number }) {
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((n) => n + 1);
  const state = useAdminReport<AdminReport<AdminUsage>>(`/admin/usage?${range}`, revision + attempt);
  const report = state?.data;
  if (!report)
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Organizer usage</h2>
        <ReportState error={state?.error} retry={retry} />
      </section>
    );
  const { data, coverage } = report;
  const metrics: [string, keyof Omit<UsageCounts, "partial">, string][] = [
    ["Visits", "visits", "visit"],
    ["Active accounts", "activeUsers", ""],
    ["Successful sign-ins", "logins", "login"],
    ["Observed accounts created", "accountsCreated", "account.created"],
    ["Observed tournaments created", "tournamentsCreated", "tournament.created"]
  ];
  return (
    <section className="space-y-4" aria-label="Organizer usage">
      <div className="flex items-center gap-1">
        <h2 className="text-2xl font-bold">Organizer usage</h2>
        <ReportTooltip label="Organizer usage details">
          <p>
            Visit collection is {data.collecting.visits ? "enabled" : "paused"}. Business observations are{" "}
            {data.collecting.business ? "enabled" : "paused"}.
          </p>
          {data.current.partial && <p>Counts for the selected period have partial coverage.</p>}
          {data.previous.partial && <p>Counts for the previous period have partial coverage.</p>}
          <p>
            Visits started: {data.starts.visits ? timestamp(data.starts.visits) : "Not yet started"}.<br />
            Business observations started: {data.starts.business ? timestamp(data.starts.business) : "Not yet started"}.<br />
            Raw events available from {timestamp(data.rawAvailableFrom)}.
          </p>
          <CoverageNotes coverage={coverage} />
        </ReportTooltip>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([title, key, kind]) => (
          <Link
            key={key}
            className="admin-panel"
            to={adminLink("/admin/activity", range, kind ? { kind } : {})}
          >
            <h3>{title}</h3>
            <p className="text-2xl font-bold my-2">
              {data.current[key]?.toLocaleString() ?? "Not available"}
            </p>
            <p className="text-sm text-padel-muted">
              Previous interval: {data.previous[key]?.toLocaleString() ?? "not available"}
            </p>
          </Link>
        ))}
      </div>
      {data.daily.length ? (
        <ReportTable
          title="Daily organizer visits · full Accra calendar days with observations"
          columns={["Day", "Visits"]}
        >
          {data.daily.map((day) => (
            <tr key={day.date}>
              <Cell>{day.date}</Cell>
              <Cell>{day.visits}</Cell>
            </tr>
          ))}
        </ReportTable>
      ) : (
        <p>No daily visit observations are available in this range.</p>
      )}
    </section>
  );
}
