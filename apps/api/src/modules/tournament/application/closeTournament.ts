import type { TournamentState } from "../../../types/state.js";
import { applyCloseTournament } from "../domain/closeOps.js";
import { assertExpectedVersion, requireOrganizerTournament } from "./loadTournament.js";
import type { TournamentEvents, TournamentRepository } from "./ports.js";

type Deps = { repo: TournamentRepository; events: TournamentEvents };

export interface CloseTournamentResult {
  tournament: TournamentState;
  voidedMatchCount: number;
}

/**
 * Close an Americano or Mexicano event, voiding anything left unplayed.
 * King of the Court closes through its own aggregate — see `modules/koh/http/closeKoh.ts`.
 */
export async function closeTournament(
  deps: Deps,
  input: { tournamentId: string; organizerId: string; expectedVersion: number }
): Promise<CloseTournamentResult> {
  const tournament = await requireOrganizerTournament(
    deps.repo,
    input.tournamentId,
    input.organizerId
  );
  assertExpectedVersion(tournament, input.expectedVersion);

  if (tournament.endedAt) {
    return { tournament, voidedMatchCount: 0 };
  }

  const voidedMatchCount = applyCloseTournament(tournament);
  await deps.repo.save(tournament, input.expectedVersion);
  await deps.events.publish({
    type: "TOURNAMENT_ENDED",
    tournamentId: tournament.id,
    payload: tournament
  });
  return { tournament, voidedMatchCount };
}
