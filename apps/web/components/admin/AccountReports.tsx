import type { AdminUserDetail, AdminUserSummary } from "@padel/shared";
import { Link } from "react-router-dom";
import { adminLink } from "../../lib/admin/reportFilters";
import { Cell, Fields, ReportTable, timestamp } from "./ReportParts";

export function AccountList({ data, range }: { data: AdminUserSummary[]; range: URLSearchParams }) {
  if (!data.length) return <p role="status">No accounts match these filters.</p>;
  return (
    <ReportTable
      title="Accounts · created in selected range"
      columns={["Account", "Type", "Verified", "Created", "Owned tournaments · all time", "Last activity"]}
    >
      {data.map((user) => (
        <tr key={user.id}>
          <Cell>
            <Link to={adminLink(`/admin/users/${encodeURIComponent(user.id)}`, range)}>
              {user.name || user.id}
            </Link>
            <p className="text-padel-muted break-all">{user.email ?? "No registered email"}</p>
          </Cell>
          <Cell>{user.accountType}</Cell>
          <Cell>{user.verified ? "Yes" : "No"}</Cell>
          <Cell>{timestamp(user.createdAt)}</Cell>
          <Cell>{user.ownedTournamentCount}</Cell>
          <Cell>{timestamp(user.lastActivityAt)}</Cell>
        </tr>
      ))}
    </ReportTable>
  );
}
export function AccountDetail({ data, range }: { data: AdminUserDetail; range: URLSearchParams }) {
  return (
    <>
      <h2 className="text-2xl font-bold break-words">{data.name || "Unnamed account"}</h2>
      <Fields
        values={{
          "Account ID": data.id,
          Email: data.email ?? "No registered email",
          "Account type": data.accountType,
          "Email verified": data.verified ? "Yes" : "No",
          Created: timestamp(data.createdAt),
          "Last activity": timestamp(data.lastActivityAt),
          "Owned tournaments · all time": data.ownedTournamentCount,
          "Performed organizer actions · retained audit": data.performedActivityCount
        }}
      />
      <div className="flex flex-wrap gap-4">
        <Link className="admin-control" to={adminLink("/admin/activity", range, { actorUserId: data.id })}>
          Observed account activity
        </Link>
        <Link className="admin-control" to={adminLink("/admin/tournaments", range, { ownerId: data.id })}>
          Owned tournaments in selected range
        </Link>
        <Link
          className="admin-control"
          to={adminLink("/admin/tournaments", new URLSearchParams({ period: "all" }), { ownerId: data.id })}
        >
          All retained owned tournaments ({data.ownedTournamentCount})
        </Link>
      </div>
      <p className="text-padel-muted text-sm">
        Owned tournaments and actions performed are separate. Last activity reflects retained observations,
        not a complete history.
      </p>
    </>
  );
}
