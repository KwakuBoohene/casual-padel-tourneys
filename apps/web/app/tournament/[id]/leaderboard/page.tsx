import { LeaderboardHeaderActions } from "../../../../components/LeaderboardHeaderActions";

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

type PodiumStyle = {
  label: string;
  icon: string;
  rankTextClass: string;
  badgeClass: string;
  podiumFillClass: string;
  accentColor: string;
  listAccentClass: string;
};

const podiumStyles: Record<number, PodiumStyle> = {
  1: {
    label: "Gold",
    icon: "🏆",
    rankTextClass: "text-[#e9c400]",
    badgeClass: "bg-[#fff2b8] text-[#9b7d00]",
    podiumFillClass: "bg-[#ebe5be]",
    accentColor: "#e1b900",
    listAccentClass: "before:bg-[#e9c400]"
  },
  2: {
    label: "Silver",
    icon: "🥈",
    rankTextClass: "text-[#c0c6d8]",
    badgeClass: "bg-[#e8f1e8] text-[#4b9b5f]",
    podiumFillClass: "bg-[#ddd9dd]",
    accentColor: "#b8b8b8",
    listAccentClass: "before:bg-[#c0c6d8]"
  },
  3: {
    label: "Bronze",
    icon: "🥉",
    rankTextClass: "text-[#cd7f32]",
    badgeClass: "bg-[#f1e4c6] text-[#b67631]",
    podiumFillClass: "bg-[#e8d0b3]",
    accentColor: "#ca7b2f",
    listAccentClass: "before:bg-[#cd7f32]"
  }
};

function initialsFromName(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function shortName(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1][0]}.`;
  }
  return name;
}

function TrophyIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
      <path d="M20 8h24v8c0 7-5 13-12 13s-12-6-12-13V8Z" fill={color} />
      <path
        d="M20 12H10v2c0 6 5 11 11 11h2"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M44 12h10v2c0 6-5 11-11 11h-2"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="28" y="29" width="8" height="11" rx="2" fill={color} />
      <rect x="22" y="40" width="20" height="6" rx="2" fill={color} />
      <rect x="18" y="48" width="28" height="6" rx="2" fill={color} />
    </svg>
  );
}

function MedalIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
      <path d="M18 6h10l4 16H22L18 6Z" fill="#6a7eab" />
      <path d="M36 6h10l-4 16H32L36 6Z" fill="#4b628f" />
      <circle cx="32" cy="38" r="16" fill={color} stroke="#1f2937" strokeWidth="1.5" />
      <circle cx="32" cy="38" r="11" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
      <path
        d="M32 31l2.1 4.3 4.7.7-3.4 3.4.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.4 4.7-.7L32 31Z"
        fill="rgba(255,255,255,0.9)"
      />
    </svg>
  );
}

function PodiumAwardIcon({ rank, color }: { rank: number; color: string }) {
  if (rank === 1) {
    return <TrophyIcon color={color} />;
  }
  return <MedalIcon color={color} />;
}

function HeroAwardIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 64" className="h-10 w-10" aria-hidden="true">
      <path d="M20 8h24v8c0 7-5 13-12 13s-12-6-12-13V8Z" fill={color} />
      <path
        d="M20 12H10v2c0 6 5 11 11 11h2"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M44 12h10v2c0 6-5 11-11 11h-2"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="28" y="29" width="8" height="11" rx="2" fill={color} />
      <rect x="22" y="40" width="20" height="6" rx="2" fill={color} />
      <rect x="18" y="48" width="28" height="6" rx="2" fill={color} />
    </svg>
  );
}

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
  const outstandingPlayers = rows.slice(0, 3);
  const champion = outstandingPlayers.find((player) => player.rank === 1);
  const runnerUp = outstandingPlayers.find((player) => player.rank === 2);
  const thirdPlace = outstandingPlayers.find((player) => player.rank === 3);
  const podiumOrder = [runnerUp, champion, thirdPlace].filter((entry): entry is PlayerRow => Boolean(entry));

  return (
    <main className="min-h-screen bg-padel-background text-padel-text px-4 py-6 md:px-10 md:py-10">
      <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-padel-muted mb-1">
            Casual Padel Tourneys
          </p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-padel-muted">
            {tournament.config.name} · {tournament.config.mode} / {tournament.config.variant}
          </p>
        </div>
        <LeaderboardHeaderActions tournamentId={route.id} />
      </header>

      {outstandingPlayers.length > 0 ? (
        <section className="mb-6 rounded-3xl border border-black/5 bg-[#f3f4f6] p-5 text-slate-800 md:p-7">
          <div className="mx-auto mb-6 max-w-md text-center">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-[#dbe5ef]">
              <HeroAwardIcon color={podiumStyles[1].accentColor} />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Well played {champion?.name ?? "Champion"}!</h2>
            <p className="mt-1 text-sm text-slate-600">You have been awarded the winner trophy</p>
          </div>

          <div className="mb-8 grid gap-2 sm:grid-cols-3">
            <div
              className={`rounded-full px-4 py-2 text-center text-xl font-bold ${podiumStyles[2].badgeClass}`}
            >
              Wins {champion?.wins ?? 0}
            </div>
            <div className="rounded-full px-4 py-2 text-center text-xl font-bold bg-[#dce6fd] text-[#3d67db]">
              Points {champion?.totalPoints ?? 0}
            </div>
            <div
              className={`rounded-full px-4 py-2 text-center text-xl font-bold ${podiumStyles[1].badgeClass}`}
            >
              Diff {(champion?.wins ?? 0) - (champion?.losses ?? 0) >= 0 ? "+" : ""}
              {(champion?.wins ?? 0) - (champion?.losses ?? 0)}
            </div>
          </div>

          <div className="grid grid-cols-3 items-end gap-3">
            {podiumOrder.map((player) => {
              const podium = podiumStyles[player.rank];
              const isChampion = player.rank === 1;

              return (
                <article key={player.playerId} className="text-center">
                  <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#103d6f] text-sm font-bold text-white">
                    {initialsFromName(player.name)}
                  </div>
                  <p className="mb-3 truncate px-1 text-lg font-medium text-slate-800">
                    {shortName(player.name)}
                  </p>
                  <div
                    className={`mx-auto flex w-full max-w-[160px] flex-col items-center justify-between rounded-t-3xl px-3 pb-4 pt-5 ${podium.podiumFillClass} ${isChampion ? "h-40" : "h-32"}`}
                  >
                    <PodiumAwardIcon rank={player.rank} color={podium.accentColor} />
                    <p className="text-4xl font-semibold text-slate-800">{player.rank}</p>
                  </div>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {podium.label}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl bg-padel-surface border border-padel-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-padel-muted">Players</h2>
          <span className="text-xs text-padel-muted">
            Last update: {new Date(tournament.updatedAt).toLocaleString()}
          </span>
        </div>

        <ol className="divide-y divide-padel-border/60">
          {rows.map((entry) => {
            const podium = podiumStyles[entry.rank];
            return (
              <li
                key={entry.playerId}
                className={`relative flex items-center justify-between py-3 ${podium ? `pl-3 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full ${podium.listAccentClass} bg-padel-surfaceAlt/40` : ""}`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`w-14 text-center text-sm font-bold ${podium ? podium.rankTextClass : "text-padel-primary"}`}
                  >
                    {podium ? `${podium.icon} #${entry.rank}` : `#${entry.rank}`}
                  </span>
                  <span className="text-sm font-medium">{entry.name}</span>
                </div>
                <div className="flex items-center gap-6 text-xs md:text-sm">
                  <span className="font-semibold text-padel-text">{entry.totalPoints} pts</span>
                  <span className="text-padel-muted">
                    W {entry.wins} · D {entry.draws} · L {entry.losses}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
