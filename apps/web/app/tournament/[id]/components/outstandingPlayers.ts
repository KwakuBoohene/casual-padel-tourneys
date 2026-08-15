import type { ScoringMode } from "@padel/shared";

import { isMatchComplete, type TournamentViewModel } from "../types";

export type TournamentLeaderboardEntry = TournamentViewModel["leaderboard"][number];
export type TournamentRound = TournamentViewModel["rounds"][number];
export type TournamentWithLeaderboard = Pick<TournamentViewModel, "leaderboard" | "rounds" | "config">;

export type OutstandingPlayerRow = {
  playerId: string;
  name: string;
  totalPoints: number;
  gamesPlayed: number;
  rank: number;
  wins: number;
  losses: number;
  draws: number;
  setsWon?: number;
  gamesWon?: number;
  isRegular?: boolean;
};

export function buildOutstandingPlayerRows(tournament: TournamentWithLeaderboard): OutstandingPlayerRow[] {
  const regular = (tournament.config?.scoringMode as ScoringMode | undefined) === "REGULAR";
  const stats = new Map<string, OutstandingPlayerRow>();

  for (const entry of tournament.leaderboard) {
    stats.set(entry.playerId, {
      playerId: entry.playerId,
      name: entry.name,
      totalPoints: entry.totalPoints,
      gamesPlayed: entry.gamesPlayed,
      rank: entry.rank,
      wins: regular ? entry.matchesWon ?? 0 : 0,
      losses: regular ? entry.matchesLost ?? 0 : 0,
      draws: 0,
      setsWon: entry.setsWon ?? 0,
      gamesWon: entry.gamesWon ?? 0,
      isRegular: regular
    });
  }

  if (!regular) {
    const bump = (playerId: string, result: "WIN" | "LOSS" | "DRAW") => {
      const row = stats.get(playerId);
      if (!row) return;
      if (result === "WIN") row.wins += 1;
      else if (result === "LOSS") row.losses += 1;
      else row.draws += 1;
    };

    for (const round of tournament.rounds) {
      for (const match of round.matches) {
        if (!isMatchComplete(match) || match.scoreA === undefined || match.scoreB === undefined) {
          continue;
        }
        const scoreA = match.scoreA;
        const scoreB = match.scoreB;

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
  }

  return [...stats.values()].sort((a, b) => {
    if (regular) {
      const byMatches = b.wins - a.wins;
      if (byMatches !== 0) return byMatches;
      const bySets = (b.setsWon ?? 0) - (a.setsWon ?? 0);
      if (bySets !== 0) return bySets;
      return (b.gamesWon ?? 0) - (a.gamesWon ?? 0);
    }
    return a.rank - b.rank;
  });
}

export function isTournamentComplete(tournament: Pick<TournamentViewModel, "rounds">) {
  return (
    tournament.rounds.length > 0 &&
    tournament.rounds.every((round) => round.matches.every((match) => isMatchComplete(match)))
  );
}
