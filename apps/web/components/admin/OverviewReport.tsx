import type { AdminOverview } from "@padel/shared";
import { Link } from "react-router-dom";
import { adminLink, label } from "../../lib/admin/reportFilters";
import { AppDbBadge, Cell, Fields, ReportTable } from "./ReportParts";
import { RecentOrganizerActivity } from "./RecentOrganizerActivity";
import { TournamentActivityChart } from "./TournamentActivityChart";

export function OverviewReport({ data, range, revision }: { data: AdminOverview; range: URLSearchParams; revision: number }) {
  const metrics = [
    ["Tournaments created", "tournamentsCreated", "/admin/tournaments", {}],
    ["Tournaments completed", "tournamentsCompleted", "/admin/tournaments", { dateBy: "completed" }],
    [
      "New registered accounts",
      "registeredAccountsCreated",
      "/admin/users",
      { accountType: "registered" }
    ],
    ["Guest accounts created", "guestAccountsCreated", "/admin/users", { accountType: "guest" }]
  ] as const;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([title, key, path, extra]) => {
          const current = data.current[key];
          const previous = data.previous[key];
          const contents = (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm font-semibold text-padel-muted">
                <h2>{title}</h2>
                <AppDbBadge />
              </div>
              <p className="my-1 text-3xl leading-tight font-bold tabular-nums">{current?.toLocaleString() ?? "Unavailable"}</p>
              <p className="text-sm text-padel-muted">
                {current === undefined ? "Completion data unavailable" : previous === undefined
                  ? "Previous period unavailable" : comparison(current, previous)}
              </p>
            </>
          );
          return current === undefined ? <div key={key} className="admin-panel">{contents}</div> : (
            <Link key={key} to={adminLink(path, range, extra)} className="admin-panel hover:border-padel-primary">
              {contents}
            </Link>
          );
        })}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[3fr_2fr]">
        <TournamentActivityChart daily={data.daily} range={data.range} />
        <RecentOrganizerActivity range={range} revision={revision} />
      </div>
      <Fields
        values={{
          "Retained registered accounts · all time": (
            <Link to="/admin/users?period=all&accountType=registered">
              {data.accounts.registered.toLocaleString()}
            </Link>
          ),
          "Retained guest accounts · all time": (
            <Link to="/admin/users?period=all&accountType=guest">
              {data.accounts.guests.toLocaleString()}
            </Link>
          ),
          "Retained accounts · all time": (
            <Link to="/admin/users?period=all">{data.accounts.total.toLocaleString()}</Link>
          )
        }}
      />
      {data.tournamentsByModeVariant.length ? (
        <ReportTable title="Tournaments created by mode" columns={["Mode", "Variant", "Created"]}>
          {data.tournamentsByModeVariant.map((group) => (
            <tr key={`${group.mode}-${group.variant}`}>
              <Cell>
                <Link
                  to={adminLink("/admin/tournaments", range, { mode: group.mode, variant: group.variant })}
                >
                  {label(group.mode)}
                </Link>
              </Cell>
              <Cell>{label(group.variant)}</Cell>
              <Cell>{group.count}</Cell>
            </tr>
          ))}
        </ReportTable>
      ) : (
        <p>No tournaments created in this range.</p>
      )}
    </>
  );
}
function comparison(current: number, previous: number): string {
  const delta = current - previous;
  return `${delta > 0 ? "+" : ""}${delta.toLocaleString()} vs previous ${previous.toLocaleString()}${previous ? ` (${delta > 0 ? "+" : ""}${Math.round((delta / previous) * 100)}%)` : " · percentage unavailable"}`;
}
