import { LeaderboardHeaderActions } from "../../../../components/LeaderboardHeaderActions";
import { formatRegularStandings } from "@padel/shared";
import Link from "next/link";
import PodiumShowcase from "./PodiumShowcase";

import { buildOutstandingPlayerRows } from "../components/outstandingPlayers";
import { formatScoringLabel, type TournamentViewModel } from "../types";

const defaultApi = "http://localhost:3004";
const internalApiBaseUrl = process.env.INTERNAL_API_BASE_URL ?? process.env.PUBLIC_API_BASE_URL ?? defaultApi;

async function getTournament(token: string) {
  const response = await fetch(`${internalApiBaseUrl}/public/${token}`, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as { data: TournamentViewModel };
  return payload.data;
}

function formatStandings(row: {
  isRegular?: boolean;
  wins: number;
  losses: number;
  setsWon?: number;
  gamesWon?: number;
  totalPoints: number;
}): string {
  if (row.isRegular) {
    return formatRegularStandings({
      wins: row.wins,
      losses: row.losses,
      setsWon: row.setsWon,
      gamesWon: row.gamesWon
    });
  }
  return `${row.totalPoints} pts`;
}

export default async function LeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const route = await params;
  const tournament = await getTournament(route.id);
  if (!tournament) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-padel-background text-padel-text px-5">
        <div className="max-w-md w-full rounded-2xl border border-padel-danger/40 bg-padel-danger/10 p-6 space-y-2 text-center">
          <p className="text-sm font-semibold text-padel-danger">Tournament not found</p>
          <p className="text-sm text-padel-muted">
            This share link is invalid or the tournament was removed.
          </p>
        </div>
      </main>
    );
  }

  const rows = buildOutstandingPlayerRows(tournament).map((row, index) => ({
    ...row,
    rank: index + 1
  }));
  const outstandingPlayers = rows.slice(0, 3);
  const scoringLabel = formatScoringLabel(String(tournament.config.mode), tournament.config.scoringMode);
  const isRegular = tournament.config.scoringMode === "REGULAR";

  return (
    <main className="min-h-screen bg-padel-background text-padel-text px-5 py-8 md:px-10 md:py-10">
      <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between max-w-3xl mx-auto w-full">
        <div className="space-y-2">
          <Link
            href={`/tournament/${route.id}`}
            className="inline-flex min-h-12 items-center text-sm font-medium text-padel-primary"
          >
            ← Live
          </Link>
          <h1 className="text-2xl md:text-[32px] font-bold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-padel-muted">
            {tournament.config.name} · {scoringLabel}
          </p>
        </div>
        <LeaderboardHeaderActions tournamentId={route.id} />
      </header>

      <div className="max-w-3xl mx-auto w-full space-y-6">
        <PodiumShowcase
          players={outstandingPlayers}
          tournamentName={tournament.config.name}
          isRegular={isRegular}
        />

        <section className="space-y-2">
          {rows.map((entry) => {
            const isLeader = entry.rank === 1;
            return (
              <div
                key={entry.playerId}
                className={[
                  "min-h-12 flex items-center justify-between gap-3 rounded-2xl border bg-padel-surface px-4 py-3.5",
                  isLeader ? "border-2 border-padel-primary" : "border-padel-border"
                ].join(" ")}
              >
                <p className="text-base font-semibold text-padel-text truncate">
                  {entry.rank}  {entry.name}
                </p>
                <p className="text-sm font-medium text-padel-muted shrink-0 text-right">
                  {formatStandings(entry)}
                </p>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
