import Link from "next/link";

import type { TournamentViewModel } from "../types";

export function MexicanoStandingsStrip({
  tournament,
  token
}: {
  tournament: TournamentViewModel;
  token: string;
}) {
  const top = [...(tournament.leaderboard ?? [])]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 8);

  if (top.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-padel-border bg-padel-surface p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-padel-text">Standings</h2>
          <p className="text-xs text-padel-muted">
            Next round pairings come from this table
          </p>
        </div>
        <Link
          href={`/tournament/${token}/leaderboard`}
          className="text-sm font-semibold text-padel-primary hover:underline shrink-0"
        >
          Full board
        </Link>
      </div>
      <ol className="space-y-1.5">
        {top.map((entry) => (
          <li
            key={entry.playerId}
            className="flex items-center justify-between gap-3 text-sm min-h-12 px-2 rounded-xl hover:bg-padel-surfaceAlt/60"
          >
            <span className="flex items-center gap-3 min-w-0">
              <span className="w-6 text-padel-muted font-semibold tabular-nums">{entry.rank}</span>
              <span className="font-semibold text-padel-text truncate">{entry.name}</span>
            </span>
            <span className="tabular-nums text-padel-muted shrink-0">
              {entry.totalPoints} pts · {entry.gamesPlayed}g
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
