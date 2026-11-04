import type { AdminActivity } from "@padel/shared";
import { Link } from "react-router-dom";
import { adminLink, timestamp } from "../../lib/admin/reportFilters";
import { Cell, ReportTable } from "./ReportParts";

function Account({ id, range }: { id: string | null; range: URLSearchParams }) {
  return id ? (
    <Link to={adminLink(`/admin/users/${encodeURIComponent(id)}`, range)}>{id}</Link>
  ) : (
    <>Unavailable</>
  );
}
export function ActivityReport({ data, range }: { data: AdminActivity[]; range: URLSearchParams }) {
  if (!data.length)
    return (
      <p role="status">
        No observed activity matches these filters. Events before collection or outside retention are
        unavailable.
      </p>
    );
  return (
    <ReportTable
      title="Observed organizer activity · last 90 days"
      columns={["Observed at", "Action", "Actor account", "Owner account", "Target"]}
    >
      {data.map((event) => (
        <tr key={event.id}>
          <Cell>{timestamp(event.occurredAt)}</Cell>
          <Cell>
            {event.kind}
            <p className="text-padel-muted">{event.route ?? event.action}</p>
          </Cell>
          <Cell>
            <Account id={event.actorUserId} range={range} />
          </Cell>
          <Cell>
            <Account id={event.ownerId} range={range} />
          </Cell>
          <Cell>
            {event.targetId &&
            (event.kind === "tournament.created" ||
              /^(POST|PUT|PATCH|DELETE) \/(koh\/)?tournaments/.test(event.action ?? "")) ? (
              <Link to={adminLink(`/admin/tournaments/${encodeURIComponent(event.targetId)}`, range)}>
                {event.targetId}
              </Link>
            ) : (
              (event.targetId ?? "—")
            )}
          </Cell>
        </tr>
      ))}
    </ReportTable>
  );
}
