import { useState } from "react";
import type { AdminActivity, AdminReportPage } from "@padel/shared";
import { Link } from "react-router-dom";
import { adminLink } from "../../lib/admin/reportFilters";
import { ActivityTarget } from "./ActivityReport";
import { AppDbBadge, Cell, ReportState, ReportTable } from "./ReportParts";
import { ReportTooltip } from "./ReportTooltip";
import { useAdminReport } from "./useAdminReport";

const activityLabels: Record<string, string> = {
  visit: "Page visit",
  login: "Sign-in",
  "account.created": "Account created",
  "account.converted": "Guest converted",
  "tournament.created": "Tournament created",
  "business.action": "Organizer action"
};
const activityTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Accra"
});

export function RecentOrganizerActivity({ range, revision }: { range: URLSearchParams; revision: number }) {
  const [attempt, setAttempt] = useState(0);
  const state = useAdminReport<AdminReportPage<AdminActivity>>(
    adminLink("/admin/activity", range, { limit: "5" }), revision + attempt
  );
  const events = state?.data?.data;
  return (
    <section className="admin-panel min-w-0" aria-label="Recent organizer activity">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <h2 className="text-lg font-bold">Recent organizer activity</h2>
          <ReportTooltip label="Recent activity coverage">
            <p>Shows the five most recent recorded actions in the selected period.</p>
            <p>Events before collection or outside retention are unavailable.</p>
          </ReportTooltip>
        </div>
        <AppDbBadge />
      </div>
      <div className="mt-3">
        {!events ? <ReportState error={state?.error} retry={() => setAttempt((n) => n + 1)} /> : events.length ? (
          <ReportTable title="Latest observed actions" columns={["Action", "Target", "Time · Accra"]} compact>
            {events.map((event) => (
              <tr key={event.id}>
                <Cell>{activityLabels[event.kind] ?? event.kind}</Cell>
                <Cell><ActivityTarget event={event} range={range} /></Cell>
                <Cell><time className="whitespace-nowrap" dateTime={event.occurredAt}>
                  {activityTime.format(new Date(event.occurredAt))}
                </time></Cell>
              </tr>
            ))}
          </ReportTable>
        ) : <p className="text-sm" role="status">No recorded actions in this range.</p>}
      </div>
      <Link className="mt-3 inline-block text-sm font-semibold" to={adminLink("/admin/activity", range)}>View all activity</Link>
    </section>
  );
}
