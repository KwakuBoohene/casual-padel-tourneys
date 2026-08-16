import type { TournamentConfig } from "@padel/shared";

import type { TournamentState } from "../../../types/state.js";
import { createTournamentState } from "../domain/createTournamentState.js";
import type { TournamentEvents, TournamentRepository } from "./ports.js";

export async function createTournament(
  deps: { repo: TournamentRepository; events: TournamentEvents },
  input: { config: TournamentConfig; organizerId: string }
): Promise<TournamentState> {
  const state = createTournamentState(input.config, input.organizerId);
  await deps.repo.create(state);
  await deps.events.publish({
    type: "TOURNAMENT_CREATED",
    tournamentId: state.id,
    payload: state
  });
  return state;
}
