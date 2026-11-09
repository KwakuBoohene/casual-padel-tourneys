import type { AdminOverview } from "@padel/shared";
import { Link } from "react-router-dom";
import { adminLink, label } from "../../lib/admin/reportFilters";
import { Cell, Fields, ReportTable, timestamp } from "./ReportParts";

export function OverviewReport({ data, range }: { data: AdminOverview; range: URLSearchParams }) {
  const metrics = [
    [
      "Registered accounts created",
      "registeredAccountsCreated",
      "/admin/users",
      { accountType: "registered" }
    ],
    ["Guest accounts created", "guestAccountsCreated", "/admin/users", { accountType: "guest" }],
    ["Tournaments created", "tournamentsCreated", "/admin/tournaments", {}]
  ] as const;
  return (
    <>
      <p className="text-sm text-padel-muted">
        Comparison: {timestamp(data.range.previousFrom)} inclusive → {timestamp(data.range.previousTo)}{" "}
        exclusive. Same duration as selected range.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map(([title, key, path, extra]) => (
          <Link key={key} to={adminLink(path, range, extra)} className="admin-panel space-y-2">
            <h2>{title}</h2>
            <p className="text-3xl font-bold">{data.current[key].toLocaleString()}</p>
            <p className="text-sm text-padel-muted">{comparison(data.current[key], data.previous[key])}</p>
          </Link>
        ))}
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
      <ReportTable
        title="Daily creation trends · Africa/Accra"
        columns={["Day", "Registered", "Guests", "Tournaments"]}
      >
        {data.daily.map((day) => (
          <tr key={day.date}>
            <Cell>{day.date}</Cell>
            <Cell>{day.registeredAccountsCreated}</Cell>
            <Cell>{day.guestAccountsCreated}</Cell>
            <Cell>{day.tournamentsCreated}</Cell>
          </tr>
        ))}
      </ReportTable>
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
