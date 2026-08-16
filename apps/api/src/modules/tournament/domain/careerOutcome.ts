import type { Match } from "@padel/shared";

import { evaluateMatch } from "../../../engine/regularScoring.js";
import type { TournamentState } from "../../../types/state.js";

/**
 * What one completed Americano/Mexicano match contributes to a career board.
 * `winnerSide` is `null` for a drawn points match — games still count, match wins do not.
 */
export interface MatchCareerOutcome {
  winnerSide: "A" | "B" | null;
  gamesA: number;
  gamesB: number;
}

/**
 * `null` when the match cannot be credited yet (draft, missing sets, or an unfinished
 * Regular scoreline). Points scorelines are the mode's own unit: `scoreA`/`scoreB` become the
 * secondary games stats, and the match win — the only ranking key — comes from who scored more.
 */
export function matchCareerOutcome(
  tournament: TournamentState,
  match: Match
): MatchCareerOutcome | null {
  if (!match.completed) {
    return null;
  }

  const scoringMode = tournament.config.scoringMode ?? "AMERICANO_POINTS";
  if (scoringMode === "REGULAR") {
    const regular = tournament.config.regularScoring;
    const sets = match.sets ?? [];
    if (!regular || sets.length === 0) {
      return null;
    }
    const evaluation = evaluateMatch(sets, regular, { a: match.matchTbA, b: match.matchTbB });
    if (!evaluation.complete || !evaluation.winner) {
      return null;
    }
    return {
      winnerSide: evaluation.winner,
      gamesA: evaluation.gamesWonA,
      gamesB: evaluation.gamesWonB
    };
  }

  if (match.scoreA === undefined || match.scoreB === undefined) {
    return null;
  }
  const winnerSide = match.scoreA === match.scoreB ? null : match.scoreA > match.scoreB ? "A" : "B";
  return { winnerSide, gamesA: match.scoreA, gamesB: match.scoreB };
}
