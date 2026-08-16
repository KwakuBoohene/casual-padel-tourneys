import type { MatchSet } from "@padel/shared";

import { logger } from "../../../lib/logger.js";
import type { TournamentState } from "../../../types/state.js";
import { matchCareerOutcome } from "../domain/careerOutcome.js";
import { findMatch } from "../domain/helpers.js";
import { applyPointsScore } from "../domain/pointsScore.js";
import { applyRegularScore } from "../domain/regularScore.js";
import { assertExpectedVersion, requireOrganizerTournament } from "./loadTournament.js";
import type { CareerCredits, TournamentEvents, TournamentRepository } from "./ports.js";

type ScoreDeps = {
  repo: TournamentRepository;
  events: TournamentEvents;
  /** Optional so in-memory tests can drive scoring without the career adapter. */
  career?: CareerCredits;
};

/**
 * Ship-forward career credit: runs after the score is saved, only for opted-in tournaments with
 * an owner. A failed credit must not fail the score, so it is logged and swallowed.
 */
async function creditCareerBoard(
  deps: ScoreDeps,
  tournament: TournamentState,
  matchId: string
): Promise<void> {
  if (!deps.career) return;
  if (tournament.config.contributeToCareerLeaderboard === false) return;
  if (!tournament.organizerId) return;

  const { match } = findMatch(tournament.rounds, matchId);
  const outcome = matchCareerOutcome(tournament, match);
  if (!outcome) return;

  try {
    await deps.career.creditCompletedMatch({
      organizerId: tournament.organizerId,
      tournamentId: tournament.id,
      tournamentName: tournament.config.name,
      tournamentMode: tournament.config.mode,
      matchId: match.id,
      teamAPlayerIds: match.teamA,
      teamBPlayerIds: match.teamB,
      winnerSide: outcome.winnerSide,
      gamesA: outcome.gamesA,
      gamesB: outcome.gamesB
    });
  } catch (error) {
    logger.error("tournament/creditCareerBoard failed", {
      tournamentId: tournament.id,
      matchId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function submitPointsScore(
  deps: ScoreDeps,
  input: {
    tournamentId: string;
    organizerId: string;
    expectedVersion: number;
    matchId: string;
    scoreA: number;
    scoreB: number;
  }
): Promise<TournamentState> {
  const tournament = await requireOrganizerTournament(
    deps.repo,
    input.tournamentId,
    input.organizerId
  );
  assertExpectedVersion(tournament, input.expectedVersion);
  applyPointsScore(tournament, input.matchId, input.scoreA, input.scoreB);
  await deps.repo.save(tournament, input.expectedVersion);
  await creditCareerBoard(deps, tournament, input.matchId);
  await deps.events.publish({
    type: "SCORE_SUBMITTED",
    tournamentId: tournament.id,
    payload: tournament
  });
  return tournament;
}

export async function submitRegularScore(
  deps: ScoreDeps,
  input: {
    tournamentId: string;
    organizerId: string;
    expectedVersion: number;
    matchId: string;
    sets: MatchSet[];
    complete: boolean;
    matchTbA?: number;
    matchTbB?: number;
  }
): Promise<TournamentState> {
  const tournament = await requireOrganizerTournament(
    deps.repo,
    input.tournamentId,
    input.organizerId
  );
  assertExpectedVersion(tournament, input.expectedVersion);
  applyRegularScore(tournament, input.matchId, input.sets, {
    complete: input.complete,
    matchTbA: input.matchTbA,
    matchTbB: input.matchTbB
  });
  await deps.repo.save(tournament, input.expectedVersion);
  await creditCareerBoard(deps, tournament, input.matchId);
  await deps.events.publish({
    type: "SCORE_SUBMITTED",
    tournamentId: tournament.id,
    payload: tournament
  });
  return tournament;
}
