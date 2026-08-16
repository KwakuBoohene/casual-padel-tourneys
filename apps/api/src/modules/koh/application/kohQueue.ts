import type { KohTournamentHub } from "../domain/types.js";
import type { KohModuleDeps } from "./ports.js";

export async function randomizeKohQueue(
  deps: KohModuleDeps,
  input: { tournamentId: string; organizerId: string; courtNumber: number }
): Promise<KohTournamentHub> {
  const hub = await deps.repo.randomizeQueue(
    input.tournamentId,
    input.organizerId,
    input.courtNumber
  );
  await deps.events.publish({
    type: "KOH_QUEUE_RANDOMIZED",
    tournamentId: hub.id,
    payload: hub
  });
  return hub;
}

export async function reorderKohQueue(
  deps: KohModuleDeps,
  input: {
    tournamentId: string;
    organizerId: string;
    courtNumber: number;
    unitIds: string[];
  }
): Promise<KohTournamentHub> {
  const hub = await deps.repo.reorderQueue(
    input.tournamentId,
    input.organizerId,
    input.courtNumber,
    input.unitIds
  );
  await deps.events.publish({
    type: "KOH_QUEUE_REORDERED",
    tournamentId: hub.id,
    payload: hub
  });
  return hub;
}
