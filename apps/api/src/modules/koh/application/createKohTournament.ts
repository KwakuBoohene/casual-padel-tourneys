import type { CreateKohTournamentInput } from "@padel/shared";

import type { KohTournamentHub } from "../domain/types.js";
import type { KohModuleDeps } from "./ports.js";

export async function createKohTournament(
  deps: KohModuleDeps,
  input: { organizerId: string; config: CreateKohTournamentInput }
): Promise<KohTournamentHub> {
  const hub = await deps.repo.create(input.config, input.organizerId);
  await deps.events.publish({
    type: "TOURNAMENT_CREATED",
    tournamentId: hub.id,
    payload: hub
  });
  return hub;
}
