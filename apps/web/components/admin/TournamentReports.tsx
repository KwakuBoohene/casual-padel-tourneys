import type { AdminTournamentDetail, AdminTournamentSummary } from "@padel/shared";
import { Link } from "react-router-dom";
import { adminLink, label } from "../../lib/admin/reportFilters";
import { Cell, Fields, ReportTable, timestamp } from "./ReportParts";
import { ReportTooltip } from "./ReportTooltip";

function Owner({ owner, range }: { owner: AdminTournamentSummary["owner"]; range: URLSearchParams }) {
  return owner ? (
    <Link to={adminLink(`/admin/users/${encodeURIComponent(owner.id)}`, range)}>
      {owner.name || owner.id}
    </Link>
  ) : (
    <>Owner unavailable</>
  );
}
export function TournamentList({ data, range, byCompletion }: {
  data: AdminTournamentSummary[];
  range: URLSearchParams;
  byCompletion: boolean;
}) {
  if (!data.length) return <p role="status">No tournaments match these filters.</p>;
  return (
    <ReportTable
      title={`Tournaments · ${byCompletion ? "completed" : "created"} in selected range`}
      columns={["Tournament", "Mode / variant", "Status", "Owner", byCompletion ? "Completed" : "Created", "Players"]}
    >
      {data.map((tournament) => (
        <tr key={tournament.id}>
          <Cell>
            <Link to={adminLink(`/admin/tournaments/${encodeURIComponent(tournament.id)}`, range)}>
              {tournament.name || tournament.id}
            </Link>
          </Cell>
          <Cell>
            {label(tournament.mode)} / {label(tournament.variant)}
          </Cell>
          <Cell>{label(tournament.status)}</Cell>
          <Cell>
            <Owner owner={tournament.owner} range={range} />
          </Cell>
          <Cell>{timestamp(byCompletion ? tournament.endedAt : tournament.createdAt)}</Cell>
          <Cell>{tournament.playerCount}</Cell>
        </tr>
      ))}
    </ReportTable>
  );
}
export function TournamentDetail({ data, range }: { data: AdminTournamentDetail; range: URLSearchParams }) {
  return (
    <>
      <div className="flex items-center gap-1">
        <h2 className="min-w-0 text-2xl font-bold wrap-break-word">{data.name || "Unnamed tournament"}</h2>
        <ReportTooltip label="Tournament statistics details">
          <p>Match counts include ordinary and King of the Court matches. Recorded matches include voided matches, while completed matches exclude them.</p>
          <p>Roster players are counted separately from accounts. Completing a tournament requires explicitly ending it.</p>
        </ReportTooltip>
      </div>
      <Fields
        values={{
          "Tournament ID": data.id,
          Mode: label(data.mode),
          Variant: label(data.variant),
          Scoring: label(data.scoringMode),
          Status: label(data.status),
          Owner: <Owner owner={data.owner} range={range} />,
          Created: timestamp(data.createdAt),
          Ended: data.endedAt ? timestamp(data.endedAt) : "Not explicitly ended",
          "Roster players": data.playerCount,
          Courts: data.courtCount,
          "Ordinary rounds": data.roundCount,
          "Recorded matches": data.matchCounts.recorded,
          "Completed matches": data.matchCounts.completed,
          "Voided matches": data.matchCounts.voided
        }}
      />
    </>
  );
}
