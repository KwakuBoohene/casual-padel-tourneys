import type { KohEndTournamentResult, KohModuleDeps } from "./ports.js";

export async function endKohTournament(
  deps: KohModuleDeps,
  input: { tournamentId: string; organizerId: string; expectedVersion: number }
): Promise<KohEndTournamentResult> {
  const result = await deps.repo.endTournament(
    input.tournamentId,
    input.organizerId,
    input.expectedVersion
  );
  await deps.events.publish({
    type: "KOH_HUB_UPDATED",
    tournamentId: result.hub.id,
    payload: result.hub
  });
  await deps.events.publish({
    type: "TOURNAMENT_ENDED",
    tournamentId: result.hub.id,
    payload: result.hub
  });
  return result;
}
