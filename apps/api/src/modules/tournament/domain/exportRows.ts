import type { LeaderboardExportRow } from "@padel/shared";

import type { TournamentState } from "../../../types/state.js";

/**
 * Derive export rows from a tournament.
 *
 * Regular standings live on the player aggregates already. Americano keeps only rally points
 * there, so wins/losses/draws and points-against are folded from completed matches — the same
 * derivation the spectator board does, kept here so the export matches what organizers see.
 * Matches that were never completed contribute nothing.
 */
export function buildTournamentExportRows(tournament: TournamentState): LeaderboardExportRow[] {
  const regular = (tournament.config.scoringMode ?? "AMERICANO_POINTS") === "REGULAR";
  const byPlayerId = new Map<string, LeaderboardExportRow>();

  for (const entry of tournament.leaderboard) {
    byPlayerId.set(entry.playerId, {
      rank: entry.rank,
      name: entry.name,
      wins: regular ? entry.matchesWon ?? 0 : 0,
      losses: regular ? entry.matchesLost ?? 0 : 0,
      draws: 0,
      gamesWon: regular ? entry.gamesWon ?? 0 : 0,
      gamesLost: regular ? entry.gamesLost ?? 0 : 0,
      americanoPointsWon: 0,
      americanoPointsLost: 0
    });
  }

  if (regular) {
    return [...byPlayerId.values()];
  }

  const credit = (playerId: string, pointsFor: number, pointsAgainst: number): void => {
    const row = byPlayerId.get(playerId);
    if (!row) return;
    if (pointsFor > pointsAgainst) row.wins += 1;
    else if (pointsFor < pointsAgainst) row.losses += 1;
    else row.draws = (row.draws ?? 0) + 1;
    row.americanoPointsWon = (row.americanoPointsWon ?? 0) + pointsFor;
    row.americanoPointsLost = (row.americanoPointsLost ?? 0) + pointsAgainst;
  };

  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      if (!match.completed) continue;
      if (match.scoreA === undefined || match.scoreB === undefined) continue;
      for (const playerId of match.teamA) credit(playerId, match.scoreA, match.scoreB);
      for (const playerId of match.teamB) credit(playerId, match.scoreB, match.scoreA);
    }
  }

  return [...byPlayerId.values()];
}
