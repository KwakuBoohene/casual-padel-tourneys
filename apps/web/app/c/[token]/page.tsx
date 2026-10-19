import { standingsLineFromRecord, type PublicCareerBoard } from "@padel/shared";

import { WebStandingsHelp } from "../../tournament/[id]/leaderboard/StandingsHelp";
import { StandingsColumnsControl } from "../../tournament/[id]/leaderboard/StandingsColumnsControl";
import { StandingsColumnsProvider } from "../../tournament/[id]/leaderboard/StandingsColumnsProvider";
import { readVisibleColumnsCookie } from "../../../lib/standingsColumnsCookie";
import { WebStandingsTable } from "../../tournament/[id]/leaderboard/StandingsTable";
import { RangeTabs } from "./RangeTabs";
import { CAREER_RANGES, parseCareerRange } from "./range";
import { internalApiBaseUrl } from "../../../lib/apiConfig";


async function getBoard(token: string, range: string): Promise<PublicCareerBoard | null> {
  const response = await fetch(
    `${internalApiBaseUrl()}/public/career/${encodeURIComponent(token)}?range=${range}`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as { data: PublicCareerBoard };
  return payload.data;
}

export default async function PublicCareerPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const route = await params;
  const query = await searchParams;
  const range = parseCareerRange(query.range);
  const board = await getBoard(route.token, range);
  const initialColumns = await readVisibleColumnsCookie();

  if (!board) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-padel-background text-padel-text px-5">
        <div className="max-w-md w-full rounded-2xl border border-padel-danger/40 bg-padel-danger/10 p-6 space-y-2 text-center">
          <p className="text-sm font-semibold text-padel-danger">Leaderboard not found</p>
          <p className="text-sm text-padel-muted">
            This link is invalid or sharing was turned off.
          </p>
        </div>
      </main>
    );
  }

  const rangeLabel = CAREER_RANGES.find((entry) => entry.id === range)?.label ?? "This year";

  return (
    <main className="min-h-screen bg-padel-background text-padel-text px-5 py-8 md:px-10 md:py-10">
      <StandingsColumnsProvider initial={initialColumns}>
      <header className="mb-8 flex flex-col gap-4 max-w-3xl mx-auto w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-[32px] font-bold tracking-tight">
              {board.organizerName}
            </h1>
            <p className="text-sm text-padel-muted">Standings · {rangeLabel} · read-only</p>
          </div>
          <div className="self-start">
            <StandingsColumnsControl />
            <WebStandingsHelp />
          </div>
        </div>
        <RangeTabs token={route.token} active={range} />
      </header>

      <div className="max-w-3xl mx-auto w-full space-y-6">
        {board.rows.length === 0 ? (
          <p className="rounded-2xl border border-padel-border bg-padel-surface p-6 text-sm text-padel-muted">
            No scored matches in this period yet.
          </p>
        ) : (
          <WebStandingsTable
            rows={board.rows.map((row, index) => ({
              id: `${row.name}-${index}`,
              rank: row.rank,
              name: row.name,
              line: standingsLineFromRecord({
                wins: row.matchesWon,
                losses: row.matchesLost,
                draws: row.matchesDrawn,
                gamesWon: row.gamesWon,
                gamesLost: row.gamesLost,
                americanoPointsWon: row.americanoPointsWon,
                americanoPointsLost: row.americanoPointsLost
              })
            }))}
          />
        )}
      </div>
      </StandingsColumnsProvider>
    </main>
  );
}
