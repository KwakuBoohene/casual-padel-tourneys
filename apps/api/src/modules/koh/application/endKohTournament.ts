import type { KohTournamentHub } from "../domain/types.js";
import type { KohModuleDeps } from "./ports.js";

export async function endKohTournament(
  deps: KohModuleDeps,
  input: { tournamentId: string; organizerId: string; expectedVersion: number }
): Promise<KohTournamentHub> {
  const hub = await deps.repo.endTournament(
    input.tournamentId,
    input.organizerId,
    input.expectedVersion
  );
  await deps.events.publish({ type: "KOH_HUB_UPDATED", tournamentId: hub.id, payload: hub });
  return hub;
}
