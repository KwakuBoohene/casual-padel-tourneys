import { countUnfinishedMatches, isMatchUnfinished } from "@padel/shared";

import type { TournamentState } from "../../../types/state.js";
import { logger } from "../../../lib/logger.js";

import { buildLeaderboard } from "./leaderboard.js";
import { touch } from "./helpers.js";

export function unfinishedMatchCount(tournament: TournamentState): number {
  return countUnfinishedMatches(tournament.rounds);
}

/**
 * Close a live event, voiding whatever was never played. Returns how many matches it voided.
 *
 * Partial scores are deliberately left on the row: the organizer can close a rained-off
 * night without us either deleting the record or crediting a result nobody finished.
 * Idempotent — closing an already-closed event voids nothing and reports 0.
 */
export function applyCloseTournament(tournament: TournamentState): number {
  if (tournament.endedAt) {
    return 0;
  }

  const now = new Date().toISOString();
  let voidedMatchCount = 0;
  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      if (!isMatchUnfinished(match)) continue;
      match.voidedAt = now;
      voidedMatchCount += 1;
    }
  }

  tournament.endedAt = now;
  tournament.leaderboard = buildLeaderboard(tournament.players, tournament.config.scoringMode);
  touch(tournament);
  logger.info("domain/applyCloseTournament", {
    tournamentId: tournament.id,
    mode: tournament.config.mode,
    voidedMatchCount,
    version: tournament.version
  });
  return voidedMatchCount;
}
