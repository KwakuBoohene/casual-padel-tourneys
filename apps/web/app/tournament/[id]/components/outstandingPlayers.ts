export type TournamentLeaderboardEntry = {
  playerId: string;
  name: string;
  totalPoints: number;
  gamesPlayed: number;
  rank: number;
};

export type TournamentRound = {
  id: string;
  roundNumber: number;
  matches: Array<{
    id: string;
    court: number;
    teamA: [string, string];
    teamB: [string, string];
    scoreA?: number;
    scoreB?: number;
  }>;
};

export type TournamentWithLeaderboard = {
  leaderboard: TournamentLeaderboardEntry[];
  rounds: TournamentRound[];
};

export type OutstandingPlayerRow = {
  playerId: string;
  name: string;
  totalPoints: number;
  gamesPlayed: number;
  rank: number;
  wins: number;
  losses: number;
  draws: number;
};

export function buildOutstandingPlayerRows(tournament: TournamentWithLeaderboard): OutstandingPlayerRow[] {
  const stats = new Map<string, OutstandingPlayerRow>();

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

export function isTournamentComplete(tournament: TournamentWithLeaderboard) {
  return (
    tournament.rounds.length > 0 &&
    tournament.rounds.every((round) =>
      round.matches.every((match) => match.scoreA !== undefined && match.scoreB !== undefined)
    )
  );
}
