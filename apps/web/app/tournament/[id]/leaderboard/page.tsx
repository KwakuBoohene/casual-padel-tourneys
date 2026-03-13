import Link from "next/link";

const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? "http://localhost:3001";

interface TournamentViewModel {
  id: string;
  config: { name: string; mode: string; variant: string };
  updatedAt: string;
  players: Array<{ id: string; name: string }>;
  leaderboard: Array<{ playerId: string; name: string; totalPoints: number; gamesPlayed: number; rank: number }>;
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
  const response = await fetch(`${apiBaseUrl}/public/${token}`, { cache: "no-store" });
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
      <main className="min-h-screen flex items-center justify-center bg-padel-background text-padel-text">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-padel-muted">Casual Padel Tourneys</p>
          <p className="text-sm text-padel-muted">Tournament not found for token: {route.id}</p>
        </div>
      </main>
    );
  }

  const rows = computeLeaderboardRows(tournament);

  return (
    <main className="min-h-screen bg-padel-background text-padel-text px-4 py-6 md:px-10 md:py-10">
      <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-padel-muted mb-1">Casual Padel Tourneys</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-padel-muted">
            {tournament.config.name} · {tournament.config.mode} / {tournament.config.variant}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-padel-muted">
          <Link
            href={`/tournament/${route.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-padel-border px-4 py-2 bg-padel-surface hover:bg-padel-surfaceAlt transition"
          >
            <span className="text-[10px] uppercase tracking-[0.2em]">Back to live view</span>
          </Link>
        </div>
      </header>

      <section className="rounded-2xl bg-padel-surface border border-padel-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-padel-muted">Players</h2>
          <span className="text-xs text-padel-muted">
            Last update: {new Date(tournament.updatedAt).toLocaleString()}
          </span>
        </div>

        <ol className="divide-y divide-padel-border/60">
          {rows.map((entry) => (
            <li key={entry.playerId} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-4">
                <span className="w-8 text-center text-sm font-bold text-padel-primary">#{entry.rank}</span>
                <span className="text-sm font-medium">{entry.name}</span>
              </div>
              <div className="flex items-center gap-6 text-xs md:text-sm">
                <span className="font-semibold text-padel-text">{entry.totalPoints} pts</span>
                <span className="text-padel-muted">
                  W {entry.wins} · D {entry.draws} · L {entry.losses}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

