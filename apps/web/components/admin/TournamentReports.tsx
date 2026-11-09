import type { AdminTournamentDetail, AdminTournamentSummary } from "@padel/shared";
import { Link } from "react-router-dom";
import { adminLink, label } from "../../lib/admin/reportFilters";
import { Cell, Fields, ReportTable, timestamp } from "./ReportParts";

function Owner({ owner, range }: { owner: AdminTournamentSummary["owner"]; range: URLSearchParams }) {
  return owner ? (
    <Link to={adminLink(`/admin/users/${encodeURIComponent(owner.id)}`, range)}>
      {owner.name || owner.id}
    </Link>
  ) : (
    <>Owner unavailable</>
  );
}
export function TournamentList({ data, range }: { data: AdminTournamentSummary[]; range: URLSearchParams }) {
  if (!data.length) return <p role="status">No tournaments match these filters.</p>;
  return (
    <ReportTable
      title="Tournaments · created in selected range"
      columns={["Tournament", "Mode / variant", "Status", "Owner", "Created", "Players"]}
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
          <Cell>{timestamp(tournament.createdAt)}</Cell>
          <Cell>{tournament.playerCount}</Cell>
        </tr>
      ))}
    </ReportTable>
  );
}
export function TournamentDetail({ data, range }: { data: AdminTournamentDetail; range: URLSearchParams }) {
  return (
    <>
      <h2 className="text-2xl font-bold break-words">{data.name || "Unnamed tournament"}</h2>
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
          "Recorded matches · includes voided": data.matchCounts.recorded,
          "Completed matches · excludes voided": data.matchCounts.completed,
          "Voided matches": data.matchCounts.voided
        }}
      />
      <p className="text-padel-muted text-sm">
        Match counts include ordinary and King of the Court matches. Roster players are not account counts.
        Completion requires explicitly ending the tournament.
      </p>
    </>
  );
}
