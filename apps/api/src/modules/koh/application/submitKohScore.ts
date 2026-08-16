import type { SubmitKohScoreInput } from "@padel/shared";

import type { KohTournamentHub } from "../domain/types.js";
import type { KohModuleDeps } from "./ports.js";

export async function submitKohScore(
  deps: KohModuleDeps,
  input: {
    tournamentId: string;
    organizerId: string;
    courtId: string;
    score: SubmitKohScoreInput;
  }
): Promise<KohTournamentHub> {
  const hub = await deps.repo.submitScore(
    input.tournamentId,
    input.organizerId,
    input.courtId,
    input.score
  );
  await deps.events.publish({
    type: "KOH_SCORE_SUBMITTED",
    tournamentId: hub.id,
    payload: hub
  });
  if (hub.lastCourtChange) {
    await deps.events.publish({
      type: "KOH_COURT_CHANGE",
      tournamentId: hub.id,
      payload: hub
    });
  }
  return hub;
}
