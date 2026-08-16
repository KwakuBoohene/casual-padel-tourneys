import type { MatchSet } from "@padel/shared";

import type { TournamentState } from "../../../types/state.js";
import { applyPointsScore } from "../domain/pointsScore.js";
import { applyRegularScore } from "../domain/regularScore.js";
import { assertExpectedVersion, requireOrganizerTournament } from "./loadTournament.js";
import type { TournamentEvents, TournamentRepository } from "./ports.js";

export async function submitPointsScore(
  deps: { repo: TournamentRepository; events: TournamentEvents },
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
  await deps.events.publish({
    type: "SCORE_SUBMITTED",
    tournamentId: tournament.id,
    payload: tournament
  });
  return tournament;
}

export async function submitRegularScore(
  deps: { repo: TournamentRepository; events: TournamentEvents },
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
  await deps.events.publish({
    type: "SCORE_SUBMITTED",
    tournamentId: tournament.id,
    payload: tournament
  });
  return tournament;
}
