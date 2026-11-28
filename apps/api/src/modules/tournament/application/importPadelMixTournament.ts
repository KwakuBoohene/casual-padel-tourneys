import { parsePadelMixCode } from "@padel/shared";

import { validation } from "../../../shared/kernel/appError.js";
import type { TournamentState } from "../../../types/state.js";
import { buildPadelMixTournamentState } from "../domain/padelMixImport.js";
import type { PadelMixSource, TournamentEvents, TournamentRepository } from "./ports.js";

/** Create a tournament from a PadelMix live link, keeping its schedule and scores. */
export async function importPadelMixTournament(
  deps: { repo: TournamentRepository; events: TournamentEvents; padelMix: PadelMixSource },
  input: { url: string; organizerId: string }
): Promise<TournamentState> {
  const code = parsePadelMixCode(input.url);
  if (!code) {
    throw validation("Paste a PadelMix live link, e.g. https://padelmix.app/live/ABC123.");
  }
  const payload = await deps.padelMix.fetchTournament(code);
  const state = buildPadelMixTournamentState(payload, input.organizerId);
  await deps.repo.create(state);
  await deps.events.publish({
    type: "TOURNAMENT_CREATED",
    tournamentId: state.id,
    payload: state
  });
  return state;
}
