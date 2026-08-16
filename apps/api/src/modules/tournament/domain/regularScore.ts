import type { MatchSet } from "@padel/shared";

import { evaluateMatch } from "../../../engine/regularScoring.js";
import type { TournamentState } from "../../../types/state.js";
import { logger } from "../../../lib/logger.js";

import { buildLeaderboard } from "./leaderboard.js";
import { findMatch, touch } from "./helpers.js";
import { applyRegularAward } from "./pointsScore.js";

export function applyRegularScore(
  tournament: TournamentState,
  matchId: string,
  sets: MatchSet[],
  options: { complete: boolean; matchTbA?: number; matchTbB?: number }
): TournamentState {
  if ((tournament.config.scoringMode ?? "AMERICANO_POINTS") !== "REGULAR") {
    throw new Error("submitRegularScore requires REGULAR scoring mode.");
  }
  const regular = tournament.config.regularScoring;
  if (!regular) {
    throw new Error("Tournament is missing regularScoring config.");
  }

  const lookup = findMatch(tournament.rounds, matchId);
  const wasCompleted = lookup.match.completed;
  if (wasCompleted && lookup.match.sets && lookup.match.sets.length > 0) {
    const prior = evaluateMatch(lookup.match.sets, regular, {
      a: lookup.match.matchTbA,
      b: lookup.match.matchTbB
    });
    if (prior.complete && prior.winner) {
      applyRegularAward(tournament.players, lookup.match, prior.winner, prior, -1);
    }
  }

  lookup.match.sets = sets.map((set) => ({ ...set }));
  lookup.match.matchTbA = options.matchTbA;
  lookup.match.matchTbB = options.matchTbB;
  lookup.match.scoreA = undefined;
  lookup.match.scoreB = undefined;

  if (!options.complete) {
    lookup.match.completed = false;
    lookup.round.isLocked = lookup.round.matches.every((match) => match.completed);
    tournament.leaderboard = buildLeaderboard(tournament.players, tournament.config.scoringMode);
    touch(tournament);
    logger.info("domain/applyRegularScore", {
      tournamentId: tournament.id,
      matchId,
      complete: false,
      version: tournament.version
    });
    return tournament;
  }

  const evaluation = evaluateMatch(sets, regular, {
    a: options.matchTbA,
    b: options.matchTbB
  });
  if (!evaluation.complete || !evaluation.winner) {
    throw new Error(evaluation.error ?? "Regular match is not complete.");
  }

  lookup.match.completed = true;
  applyRegularAward(tournament.players, lookup.match, evaluation.winner, evaluation, 1);
  lookup.round.isLocked = lookup.round.matches.every((match) => match.completed);
  tournament.leaderboard = buildLeaderboard(tournament.players, tournament.config.scoringMode);
  touch(tournament);
  logger.info("domain/applyRegularScore", {
    tournamentId: tournament.id,
    matchId,
    complete: true,
    winner: evaluation.winner,
    version: tournament.version
  });
  return tournament;
}
