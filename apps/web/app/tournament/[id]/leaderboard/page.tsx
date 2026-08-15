import { LeaderboardHeaderActions } from "../../../../components/LeaderboardHeaderActions";
import Link from "next/link";
import PodiumShowcase from "./PodiumShowcase";

const defaultApi = "http://localhost:3004";
const internalApiBaseUrl = process.env.INTERNAL_API_BASE_URL ?? process.env.PUBLIC_API_BASE_URL ?? defaultApi;

interface TournamentViewModel {
  id: string;
  config: { name: string; mode: string; variant: string };
  updatedAt: string;
  players: Array<{ id: string; name: string }>;
  leaderboard: Array<{
    playerId: string;
    name: string;
    totalPoints: number;
    gamesPlayed: number;
    rank: number;
  }>;
  rounds: Array<{
    id: string;
    roundNumber: number;
    matches: Array<{
      id: string;
      court: number;
      teamA: [string, string];
      teamB: [string, string];
      scoreA?: number;
      scoreB?: number;
      completed?: boolean;
    }>;
  }>;
}

async function getTournament(token: string) {
  const response = await fetch(`${internalApiBaseUrl}/public/${token}`, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as { data: TournamentViewModel };
  return payload.data;
}

type PlayerRow = {
  playerId: string;
  name: string;
  totalPoints: number;
  gamesPlayed: number;
  rank: number;
  wins: number;
  losses: number;
  draws: number;
};

function computeLeaderboardRows(tournament: TournamentViewModel): PlayerRow[] {
  const stats = new Map<string, PlayerRow>();

  for (const entry of tournament.leaderboard) {
    stats.set(entry.playerId, {
      playerId: entry.playerId,
      name: entry.name,
      totalPoints: entry.totalPoints,
      gamesPlayed: entry.gamesPlayed,
      rank: entry.rank,
      wins: 0,
      losses: 0,
      draws: 0
    });
  }

  const bump = (playerId: string, result: "WIN" | "LOSS" | "DRAW") => {
    const row = stats.get(playerId);
    if (!row) return;
    if (result === "WIN") row.wins += 1;
    else if (result === "LOSS") row.losses += 1;
    else row.draws += 1;
  };

  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      const scoreA = match.scoreA;
      const scoreB = match.scoreB;
      if (scoreA === undefined || scoreB === undefined) continue;

      let resultA: "WIN" | "LOSS" | "DRAW" = "DRAW";
      let resultB: "WIN" | "LOSS" | "DRAW" = "DRAW";
      if (scoreA > scoreB) {
        resultA = "WIN";
        resultB = "LOSS";
      } else if (scoreB > scoreA) {
        resultA = "LOSS";
        resultB = "WIN";
      }

      for (const playerId of match.teamA) {
        bump(playerId, resultA);
      }
      for (const playerId of match.teamB) {
        bump(playerId, resultB);
      }
    }
  }

  return [...stats.values()].sort((a, b) => a.rank - b.rank);
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

  const rows = computeLeaderboardRows(tournament);
  const outstandingPlayers = rows.slice(0, 3);
  const scoringLabel =
    tournament.config.mode === "MEXICANO"
      ? "Mexicano scoring"
      : tournament.config.mode === "AMERICANO"
        ? "Americano scoring"
        : `${tournament.config.mode} scoring`;

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
        <PodiumShowcase players={outstandingPlayers} tournamentName={tournament.config.name} />

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
                <p className="text-sm font-medium text-padel-muted shrink-0">
                  {entry.totalPoints} pts
                </p>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
