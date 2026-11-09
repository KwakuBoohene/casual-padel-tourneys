import { useState } from "react";
import type { AdminReport, AdminUsage, UsageCounts } from "@padel/shared";
import { Link } from "react-router-dom";
import { adminLink, timestamp } from "../../lib/admin/reportFilters";
import { useAdminReport } from "./useAdminReport";
import { Cell, Coverage, ReportState, ReportTable } from "./ReportParts";

export function UsageOverview({ range, revision }: { range: URLSearchParams; revision: number }) {
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((n) => n + 1);
  const state = useAdminReport<AdminReport<AdminUsage>>(`/admin/usage?${range}`, revision + attempt);
  const data = state?.data?.data;
  if (!data)
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Organizer usage</h2>
        <ReportState error={state?.error} retry={retry} />
      </section>
    );
  const metrics: [string, keyof Omit<UsageCounts, "partial">, string][] = [
    ["Visits", "visits", "visit"],
    ["Active accounts", "activeUsers", ""],
    ["Successful sign-ins", "logins", "login"],
    ["Observed accounts created", "accountsCreated", "account.created"],
    ["Observed tournaments created", "tournamentsCreated", "tournament.created"]
  ];
  return (
    <section className="space-y-4" aria-label="Organizer usage">
      <h2 className="text-2xl font-bold">Organizer usage</h2>
      <p className="text-padel-muted text-sm">
        Public viewer visits are not tracked. Visit collection {data.collecting.visits ? "enabled" : "paused"}
        ; business observations {data.collecting.business ? "enabled" : "paused"}.{" "}
        {data.current.partial
          ? "Partial coverage: counts include only observations available in this range."
          : "Counts cover observed usage in this range."}
      </p>
      <p className="text-padel-muted text-sm">
        Visits observed since {data.starts.visits ? timestamp(data.starts.visits) : "not yet started"};
        business observations since{" "}
        {data.starts.business ? timestamp(data.starts.business) : "not yet started"}. Raw events available
        from {timestamp(data.rawAvailableFrom)}.
      </p>
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
              {data.previous.partial ? " · partial coverage" : ""}
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
      <Coverage coverage={state.data!.coverage} />
    </section>
  );
}
